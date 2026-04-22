export default function AdsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Chat Ads Study</h1>
        <p className="text-sm text-muted-foreground">Study ID: study-1</p>
      </div>
      {children}
    </div>
  );
}
