export const metadata = {
  title: "Dex Radio",
  description: "Dex Radio",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
