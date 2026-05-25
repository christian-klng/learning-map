import type { Role } from '$lib/server/auth';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      role: Role;
      name: string | null;
    }
    interface PageData {
      session: { role: Role; name: string | null };
    }
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
