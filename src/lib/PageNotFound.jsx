import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function PageNotFound() {
  const location = useLocation();
  const pageName = location.pathname.substring(1) || "/";

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-slate-300">404</h1>
          <div className="h-0.5 w-16 bg-slate-200 mx-auto" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-medium text-slate-800">Page Not Found</h2>
          <p className="text-slate-600 leading-relaxed">
            The page <span className="font-medium text-slate-700">&quot;{pageName}&quot;</span> doesn&apos;t exist.
          </p>
        </div>
        <Link to="/" aria-label="Go home">
          <Button variant="outline" className="inline-flex items-center">
            <Home className="w-4 h-4 mr-2" aria-hidden="true" />
            Go home
          </Button>
        </Link>
      </div>
    </div>
  );
}
