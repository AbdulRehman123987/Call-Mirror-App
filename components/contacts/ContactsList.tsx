"use client";

import React, { useState, useEffect } from "react";
import { Search, Phone, Video, Users } from "lucide-react";
import { Contact, socketService } from "@/lib/socket";
import { contactsService } from "@/lib/contacts";
import { useCall } from "@/contexts/CallContext";
import { ContactItem } from "./ContactItem";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const contactSchema = z.object({
  fullName: z
    .string()
    .min(3, "Name must be at least 3 characters")
    .max(18, "Name is too long"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(11, "Must be 11 digits").max(15, "maximum 15 digits"),
});

type AddContactFormData = z.infer<typeof contactSchema>;

export function ContactsList() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [filteredContacts, setFilteredContacts] = useState<Contact[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { initiateCall } = useCall();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AddContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: AddContactFormData) => {
    setFormLoading(true);
    try {
      const response = await contactsService.addNewContact(
        data.email,
        data.fullName,
        data.phone
      );

      if (response?.status === 201) {
        await loadContacts();
        console.log("Contact created successfully");
      } else if (response?.status === 409) {
        alert("This contact already exists.");
      } else {
        alert(response?.message);
      }
    } catch (error) {
      alert("An error occurred while adding contact.");
      console.error(error);
    } finally {
      reset();
      setFormLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
    setupPresenceUpdates();
  }, []);

  useEffect(() => {
    filterContacts();
  }, [contacts, searchQuery]);

  const loadContacts = async () => {
    try {
      const contactsData = await contactsService.getContacts();
      setContacts(contactsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  // console.log(contacts);

  const setupPresenceUpdates = () => {
    socketService.onPresenceUpdate((updatedContacts) => {
      setContacts(updatedContacts);
    });
  };

  const filterContacts = () => {
    if (!searchQuery.trim()) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(
      (contact) =>
        contact.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contact.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredContacts(filtered);
  };

  const handleCall = (contact: Contact, type: "audio" | "video") => {
    initiateCall(contact, type);
  };

  const groupedContacts =
    contactsService.groupContactsAlphabetically(filteredContacts);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={loadContacts}
          className="mt-2 text-blue-600 hover:text-blue-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          <div className="flex items-center text-sm text-gray-500">
            <Users className="h-4 w-4 mr-1" />
            {contacts?.length} contacts
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1">
        <div className="flex-1 h-[430px] overflow-y-auto overflow-x-hidden">
          {Object.keys(groupedContacts).length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? "No contacts found" : "No contacts yet"}
              </p>

              <Dialog>
                <DialogTrigger
                  asChild
                  className="w-full bg-blue-500 py-5 text-white cursor-pointer font-medium relative bottom-0 hover:bg-blue-400"
                >
                  <Button>Add Contact</Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[425px]">
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <DialogHeader>
                      <DialogTitle>Create Contact</DialogTitle>
                      <DialogDescription>
                        Enter details to add a new contact.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                      <div className="grid gap-2">
                        <Label htmlFor="fullName">Full Name</Label>
                        <Input
                          id="fullName"
                          {...register("fullName", {
                            required: "Name is required",
                          })}
                          placeholder="FullName..."
                        />
                        {errors.fullName && (
                          <span className="text-red-500 text-sm">
                            {errors.fullName.message}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          {...register("email", {
                            required: "Email is required",
                            pattern: {
                              value: /^\S+@\S+$/i,
                              message: "Invalid email address",
                            },
                          })}
                          placeholder="Email..."
                        />
                        {errors.email && (
                          <span className="text-red-500 text-sm">
                            {errors.email.message}
                          </span>
                        )}
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          {...register("phone", {
                            required: "Phone number is required",
                            pattern: {
                              value: /^03[0-9]{9}$/,
                              message: "Enter a valid Pakistani number",
                            },
                          })}
                          placeholder="030xxxxxxxx"
                        />
                        {errors.phone && (
                          <span className="text-red-500 text-sm">
                            {errors.phone.message}
                          </span>
                        )}
                      </div>
                    </div>

                    <DialogFooter className="mt-4">
                      <DialogClose asChild>
                        <Button variant="outline" type="button">
                          Cancel
                        </Button>
                      </DialogClose>
                      <Button type="submit">Create</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            Object.entries(groupedContacts)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([letter, groupContacts]) => (
                <div key={letter} className="mb-6">
                  <div className="sticky top-0 z-10 bg-gray-50 px-4 py-1 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase">
                      {letter}
                    </h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {groupContacts.map((contact) => (
                      <ContactItem
                        key={contact.id}
                        contact={contact}
                        onCall={handleCall}
                      />
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>

        <Dialog>
          <DialogTrigger
            asChild
            className="w-full bg-blue-500 py-5 text-white cursor-pointer font-medium relative bottom-0 hover:bg-blue-400"
          >
            <Button>Add Contact</Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit(onSubmit)}>
              <DialogHeader>
                <DialogTitle>Create Contact</DialogTitle>
                <DialogDescription>
                  Enter details to add a new contact.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    {...register("fullName", { required: "Name is required" })}
                    placeholder="FullName..."
                  />
                  {errors.fullName && (
                    <span className="text-red-500 text-sm">
                      {errors.fullName.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: "Invalid email address",
                      },
                    })}
                    placeholder="Email..."
                  />
                  {errors.email && (
                    <span className="text-red-500 text-sm">
                      {errors.email.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    {...register("phone", {
                      required: "Phone number is required",
                      pattern: {
                        value: /^03[0-9]{9}$/,
                        message: "Enter a valid Pakistani number",
                      },
                    })}
                    placeholder="030xxxxxxxx"
                  />
                  {errors.phone && (
                    <span className="text-red-500 text-sm">
                      {errors.phone.message}
                    </span>
                  )}
                </div>
              </div>

              <DialogFooter className="mt-4">
                <DialogClose asChild>
                  <Button variant="outline" type="button">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Create</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
