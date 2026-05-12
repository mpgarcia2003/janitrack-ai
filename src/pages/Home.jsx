import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  QrCode,
  ShieldCheck,
  Package,
  Star,
  Activity,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const features = [
  {
    icon: QrCode,
    title: "QR Check-Ins",
    body:
      "Cleaners scan a sticker, capture an optional photo, and check in with GPS and time stamps — no app install, no learning curve.",
  },
  {
    icon: Star,
    title: "Live Customer Feedback",
    body:
      "Facility users rate areas or whole facilities in seconds. Trouble spots auto-escalate so you fix issues before they show up in a survey.",
  },
  {
    icon: Package,
    title: "Closet-Level Inventory",
    body:
      "Track par levels, reorder points, and usage by location. Public inventory QR makes supply audits a 30-second job for the on-site team.",
  },
  {
    icon: Activity,
    title: "Compliance Reports",
    body:
      "Per-area cadence, on-time percentage, last-cleaned timestamps, and CSV exports your supervisor will actually open.",
  },
  {
    icon: ShieldCheck,
    title: "Multi-Tenant by Design",
    body:
      "Every record is scoped to a tenant on the server, not just the client. Public QR endpoints derive the tenant from a signed token, never the request body.",
  },
  {
    icon: Sparkles,
    title: "Built for Janitorial Crews",
    body:
      "JaniTrackAI is part of the GreenPoint family of brands — designed by an operator, for operators who hate sticky-note checklists.",
  },
];

const pricing = [
  {
    name: "Free",
    price: "$0",
    cadence: "/month",
    bullets: ["1 client location", "Up to 10 areas", "QR check-ins + feedback", "14-day trial of paid features"],
  },
  {
    name: "Pro",
    price: "$49",
    cadence: "/month",
    highlight: true,
    bullets: [
      "Unlimited client locations",
      "Inventory + Projects",
      "Branded QR code printouts",
      "CSV exports + reporting",
      "Email + SMS escalation",
    ],
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    bullets: ["SSO + audit log access", "Dedicated success manager", "Custom integrations", "SLA + onboarding support"],
  },
];

export default function Home() {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header isAuthenticated={isAuthenticated} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-700 text-white">
        <div className="absolute inset-0 opacity-10" aria-hidden="true">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #C8A34D 0, transparent 40%), radial-gradient(circle at 80% 60%, #1B7A3D 0, transparent 40%)",
            }}
          />
        </div>
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center px-3 py-1 rounded-full bg-white/10 text-xs font-semibold uppercase tracking-wider">
              Part of the GreenPoint family
            </span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight mb-6">
            QR-verified cleaning, <span className="text-yellow-200">without the spreadsheet.</span>
          </h1>
          <p className="text-lg md:text-xl text-emerald-50 max-w-2xl mb-10 leading-relaxed">
            JaniTrackAI gives janitorial operators a single source of truth for check-ins, feedback,
            inventory, and work requests — all driven by a QR code on the wall.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to={isAuthenticated ? "/Dashboard" : "/TenantSignup"}>
              <Button className="h-12 px-7 text-base bg-yellow-400 text-emerald-900 hover:bg-yellow-300 shadow-lg">
                {isAuthenticated ? "Open dashboard" : "Start free trial"}
                <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
              </Button>
            </Link>
            <a href="#features">
              <Button variant="outline" className="h-12 px-7 text-base border-white/30 text-white hover:bg-white/10">
                See how it works
              </Button>
            </a>
          </div>
          <div className="mt-12 flex flex-wrap gap-6 text-emerald-50 text-sm">
            <Stat label="Average scan-to-recorded" value="< 3s" />
            <Stat label="Tenant-isolated by default" value="Server-side" />
            <Stat label="Trial" value="14 days, no card" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-emerald-700 font-semibold uppercase tracking-wider text-sm mb-3">What you get</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            The whole cleaning operation, on a single dashboard.
          </h2>
          <p className="text-slate-600 leading-relaxed">
            Six pieces. One product. Designed for the supervisor who's tired of texting photos to clients
            and the operations lead who's tired of asking &quot;was this cleaned?&quot;
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-slate-50 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <p className="text-emerald-700 font-semibold uppercase tracking-wider text-sm mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Stick a QR code. Done.</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="1"
              title="Define your areas"
              body="Add client locations, then break them into the areas you actually clean — restrooms, cafeterias, classroom wings."
            />
            <Step
              number="2"
              title="Print branded QR codes"
              body="One click prints a branded sign for every area, feedback point, and inventory closet."
            />
            <Step
              number="3"
              title="Watch the data come in"
              body="Cleaners scan when they finish. Visitors scan to leave feedback. Supervisors get an alert when something's overdue."
            />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <p className="text-emerald-700 font-semibold uppercase tracking-wider text-sm mb-3">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Straightforward, like the rest of the product.</h2>
          <p className="text-slate-600 leading-relaxed">
            Start free. Upgrade when you need branded QR codes, exports, and unlimited locations.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {pricing.map((tier) => (
            <PricingCard key={tier.name} tier={tier} ctaTo={isAuthenticated ? "/Billing" : "/TenantSignup"} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-emerald-900 text-white">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Stop guessing. Start verifying.
          </h2>
          <p className="text-emerald-100 max-w-xl mx-auto mb-8">
            14-day free trial. No credit card. If you can stick a sticker, you can run JaniTrackAI.
          </p>
          <Link to={isAuthenticated ? "/Dashboard" : "/TenantSignup"}>
            <Button className="h-12 px-8 text-base bg-yellow-400 text-emerald-900 hover:bg-yellow-300 shadow-lg">
              {isAuthenticated ? "Open dashboard" : "Create your account"}
              <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function Header({ isAuthenticated }) {
  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" aria-label="JaniTrackAI home">
          <div className="w-9 h-9 rounded-lg bg-emerald-700 flex items-center justify-center shadow-sm">
            <QrCode className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-lg tracking-tight">JaniTrackAI</span>
        </Link>
        <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
          <a href="#features" className="hover:text-slate-900">
            Features
          </a>
          <a href="#pricing" className="hover:text-slate-900">
            Pricing
          </a>
          <a
            href="https://www.greenpointms.com"
            className="hover:text-slate-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            GreenPoint
          </a>
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link to="/Dashboard">
              <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">Open dashboard</Button>
            </Link>
          ) : (
            <Link to="/TenantSignup">
              <Button className="bg-emerald-700 hover:bg-emerald-800 text-white">Start free trial</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function Stat({ label, value }) {
  return (
    <div className="flex items-center gap-3">
      <CheckCircle2 className="w-5 h-5 text-yellow-200" aria-hidden="true" />
      <div>
        <p className="text-sm uppercase tracking-wide text-emerald-200">{label}</p>
        <p className="text-base font-semibold">{value}</p>
      </div>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, body }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 hover:shadow-md transition-shadow">
      <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 leading-relaxed text-sm">{body}</p>
    </div>
  );
}

function Step({ number, title, body }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center mb-4">
        {number}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{body}</p>
    </div>
  );
}

function PricingCard({ tier, ctaTo }) {
  return (
    <div
      className={`rounded-2xl p-8 border ${
        tier.highlight
          ? "bg-emerald-900 text-white border-emerald-700 shadow-xl scale-[1.02]"
          : "bg-white border-slate-200"
      }`}
    >
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-xl font-bold">{tier.name}</h3>
        {tier.highlight ? (
          <span className="text-xs uppercase tracking-wide bg-yellow-400 text-emerald-900 px-2 py-0.5 rounded-full font-semibold">
            Recommended
          </span>
        ) : null}
      </div>
      <div className="mb-6">
        <span className={`text-4xl font-bold ${tier.highlight ? "text-white" : "text-slate-900"}`}>{tier.price}</span>
        <span className={tier.highlight ? "text-emerald-200" : "text-slate-500"}>{tier.cadence}</span>
      </div>
      <ul className="space-y-3 mb-8">
        {tier.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-sm">
            <CheckCircle2
              className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlight ? "text-yellow-300" : "text-emerald-600"}`}
              aria-hidden="true"
            />
            <span className={tier.highlight ? "text-emerald-50" : "text-slate-700"}>{b}</span>
          </li>
        ))}
      </ul>
      <Link to={ctaTo} className="block">
        <Button
          className={`w-full ${
            tier.highlight
              ? "bg-yellow-400 text-emerald-900 hover:bg-yellow-300"
              : "bg-emerald-700 text-white hover:bg-emerald-800"
          }`}
        >
          {tier.name === "Enterprise" ? "Contact us" : "Get started"}
        </Button>
      </Link>
    </div>
  );
}

function Footer() {
  return (
    <footer className="bg-slate-50 border-t border-slate-200">
      <div className="max-w-6xl mx-auto px-6 py-12 grid md:grid-cols-3 gap-8 text-sm text-slate-600">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-700 flex items-center justify-center">
              <QrCode className="w-4 h-4 text-white" aria-hidden="true" />
            </div>
            <span className="font-bold text-base text-slate-900">JaniTrackAI</span>
          </div>
          <p className="leading-relaxed">
            QR-based cleaning quality verification, inventory tracking, and feedback for janitorial operators.
          </p>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Product</h4>
          <ul className="space-y-2">
            <li>
              <a href="#features" className="hover:text-slate-900">
                Features
              </a>
            </li>
            <li>
              <a href="#pricing" className="hover:text-slate-900">
                Pricing
              </a>
            </li>
            <li>
              <Link to="/TenantSignup" className="hover:text-slate-900">
                Start trial
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 mb-3">Company</h4>
          <ul className="space-y-2">
            <li>
              <a
                href="https://www.greenpointms.com"
                className="hover:text-slate-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                GreenPoint Maintenance Services
              </a>
            </li>
            <li>
              <a href="mailto:hello@greenpointms.com" className="hover:text-slate-900">
                hello@greenpointms.com
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} JaniTrackAI · A GreenPoint family product
      </div>
    </footer>
  );
}
