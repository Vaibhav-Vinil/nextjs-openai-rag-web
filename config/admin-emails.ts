export const adminEmails = [
  "root@example.com",
  // Add more admin emails here
];

export function isAdmin(email: string): boolean {
  return adminEmails.includes(email);
}
