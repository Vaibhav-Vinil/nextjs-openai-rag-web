export const adminEmails = [
  "root@example.com", "info@pv.market"
  // Add more admin emails here
];

export function isAdmin(email: string): boolean {
  return adminEmails.includes(email);
}
