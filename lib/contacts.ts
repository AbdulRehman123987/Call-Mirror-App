import { authService } from "./auth";
import { Contact } from "./socket";
import { dummyContacts } from "../components/contacts/dummyContacts.js";
import Cookies from "js-cookie";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class ContactsService {
  // async getContacts() {
  //   const response = dummyContacts;
  //   return response;
  // }

  async getContacts(): Promise<Contact[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const userId = localStorage.getItem("userId");
    if (!userId) {
      throw new Error("Unauthorized error.");
    }

    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        await authService.refreshToken();
        return this.getContacts();
      }
      throw new Error("Failed to fetch contacts");
    }

    const jsonData = await response.json();

    return Array.isArray(jsonData.data) ? jsonData.data : [];
  }

  async addNewContact(
    email: string,
    fullName: string,
    phone: string
  ): Promise<{ status: number; message: string } | null> {
    const accessToken = Cookies.get("accessToken");
    if (!accessToken) return null;

    const response = await fetch(`${API_BASE_URL}/contact/create`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ email, fullName, phone }),
    });

    const data = await response.json();

    return {
      status: response.status,
      message:
        data.message ||
        (response.ok ? "Contact added successfully" : "Failed to add contact"),
    };
  }

  async searchContacts(query: string): Promise<Contact[]> {
    const token = authService.getAccessToken();
    if (!token) {
      throw new Error("No access token available");
    }

    const response = await fetch(
      `${API_BASE_URL}/contacts/search?q=${encodeURIComponent(query)}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await authService.refreshToken();
        return this.searchContacts(query);
      }
      throw new Error("Failed to search contacts");
    }

    return await response.json();
  }

  groupContactsAlphabetically(contacts: Contact[]): Record<string, Contact[]> {
    return contacts.reduce((groups, contact) => {
      const firstLetter = contact.fullName?.charAt(0).toUpperCase();
      if (!groups[firstLetter]) {
        groups[firstLetter] = [];
      }
      groups[firstLetter].push(contact);
      return groups;
    }, {} as Record<string, Contact[]>);
  }
}

export const contactsService = new ContactsService();
