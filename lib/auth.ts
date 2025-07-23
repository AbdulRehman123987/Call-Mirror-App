import Cookies from "js-cookie";

export interface User {
  id: string;
  email: string;
  fullName: string;
  avatar?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;

  async signUp(
    email: string,
    password: string,
    fullName: string,
    confirmPassword: string,
    phone: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_BASE_URL}/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        fullName,
        confirmPassword,
        phone,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Sign up failed");
    }

    const data = await response.json();
    // this.setTokens(data.tokens);
    // this.startTokenRefresh();
    return data;
  }

  async signIn(
    email: string,
    password: string
  ): Promise<{ user: User; tokens: AuthTokens }> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Sign in failed");
    }

    const data = await response.json();
    const userId = data.user.id;
    localStorage.setItem("userId", userId);
    const accessToken = data.access_token;
    const refreshToken = data.refresh_token;
    this.setTokens({ accessToken, refreshToken });
    this.startTokenRefresh();
    return data;
  }

  async resetPassword(email: string): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Password reset failed");
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    const userId = localStorage.getItem("userId");
    const refreshToken = Cookies.get("refreshToken");
    if (!refreshToken) {
      throw new Error("No refresh token available");
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken, userId }),
    });

    if (!response.ok) {
      this.signOut();
      throw new Error("Token refresh failed");
    }

    const tokens = await response.json();
    this.setTokens(tokens);
    return tokens;
  }

  async getCurrentUser(): Promise<User | null> {
    const accessToken = Cookies.get("accessToken");
    if (!accessToken) return null;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this.refreshToken();
          return this.getCurrentUser();
        }
        return null;
      }

      return await response.json();
    } catch (error) {
      return null;
    }
  }

  async signOut(): Promise<void> {
    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Cookies.get("accessToken")}`,
        },
      })
        .then(() => {
          Cookies.remove("accessToken");
          Cookies.remove("refreshToken");
          localStorage.removeItem("userId");

          if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
          }
        })
        .catch((error) => {
          console.error("Logout failed:", error);
        });
    } catch (error) {
      console.error("Unexpected logout error:", error);
    }
  }

  // signOut(): void {
  //   try {
  //     const response = fetch(`${API_BASE_URL}/auth/logout`, {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       credentials:
  //     });
  //     Cookies.remove("accessToken");
  //     Cookies.remove("refreshToken");
  //     if (this.refreshTimer) {
  //       clearInterval(this.refreshTimer);
  //       this.refreshTimer = null;
  //     }
  //   } catch (error) {}
  // }

  getAccessToken(): string | undefined {
    return Cookies.get("accessToken");
  }

  private setTokens(tokens: AuthTokens): void {
    Cookies.set("accessToken", tokens.accessToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
    Cookies.set("refreshToken", tokens.refreshToken, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });
  }

  private startTokenRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    // Refresh token every 5 minutes
    this.refreshTimer = setInterval(async () => {
      try {
        await this.refreshToken();
      } catch (error) {
        console.error("Silent token refresh failed:", error);
      }
    }, 5 * 60 * 1000);
  }

  initializeTokenRefresh(): void {
    const accessToken = Cookies.get("accessToken");
    if (accessToken) {
      this.startTokenRefresh();
    }
  }
}

export const authService = new AuthService();
