import PageShell from '@/components/layout/PageShell'

export default function Privacy() {
  return (
    <PageShell title="Privacy Policy" subtitle="How LoadLink handles your data">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Location Data</h2>
          <p>
            LoadLink uses location data on an <span className="font-medium">opt-in basis</span>.
            When you choose to share your location, it is used solely to tailor load
            recommendations and improve matching accuracy. Your location is processed on an
            as-needed basis and is not stored beyond initial processing.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Data We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm">
            <li>Account information (name, email, role)</li>
            <li>Load and bidding activity</li>
            <li>Optional location data when explicitly enabled</li>
            <li>Documents required for compliance (insurance, licenses)</li>
          </ul>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">How We Use Data</h2>
          <p>
            We use your information to operate the marketplace, match loads, process bids,
            generate contracts, and provide customer support. We do not sell personal data
            to third parties.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Security</h2>
          <p>
            Access is protected via Firebase Authentication and role-based authorization.
            Sensitive operations require authenticated sessions. Data retention follows
            operational necessity and applicable regulations.
          </p>
        </div>

        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Your Choices</h2>
          <p>
            You may update profile details, disable location sharing at any time, request
            account deletion, or contact support with privacy concerns via the Report page.
          </p>
        </div>

        <p className="text-xs text-muted-foreground">
          Last updated: {new Date().getFullYear()} LoadLink. This policy may be updated as
          the platform evolves.
        </p>
      </div>
    </PageShell>
  )
}