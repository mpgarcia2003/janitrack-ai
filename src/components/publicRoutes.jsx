export const PUBLIC_ROUTES = {
  exact: [
    '/scancheckin',
    '/feedbackqr',
    '/newprojectqr',
    '/tenantsignup',
    '/inventoryaccess'
  ],
  patterns: [
    /^\/scancheckin/i,
    /^\/feedbackqr/i,
    /^\/newprojectqr/i,
    /^\/tenantsignup/i,
    /^\/inventoryaccess/i
  ]
};

export const isPublicRoute = (pathname) => {
  if (!pathname) return false;
  
  const normalizedPath = pathname.toLowerCase();
  
  // Check exact matches
  if (PUBLIC_ROUTES.exact.some(route => normalizedPath.includes(route.toLowerCase()))) {
    return true;
  }
  
  // Check pattern matches
  if (PUBLIC_ROUTES.patterns.some(pattern => pattern.test(pathname))) {
    return true;
  }
  
  return false;
};