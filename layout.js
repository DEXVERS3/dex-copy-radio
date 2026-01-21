export const metadata = {
  title: "Dex App",
  description: "Dex App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
