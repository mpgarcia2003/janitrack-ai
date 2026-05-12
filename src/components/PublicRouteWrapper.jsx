import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { isPublicRoute } from './publicRoutes';

export function PublicRouteWrapper({ children }) {
  const location = useLocation();
  const [isPublic, setIsPublic] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkRoute = () => {
      const pathname = location.pathname;
      const hash = location.hash;
      const fullPath = pathname + hash;
      
      console.log('PublicRouteWrapper checking:', { pathname, hash, fullPath });
      
      const publicCheck = isPublicRoute(pathname) || isPublicRoute(fullPath);
      console.log('Is public route?', publicCheck);
      
      setIsPublic(publicCheck);
      setIsChecking(false);
    };

    checkRoute();
  }, [location]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isPublic) {
    console.warn('Not a public route, but wrapped with PublicRouteWrapper');
  }

  return <>{children}</>;
}