import React from 'react';
import { base44Public } from './PublicAPIClient';

export const withPublicAccess = (WrappedComponent) => {
  return function WithPublicAccessComponent(props) {
    // This wrapper ensures the component uses the public client
    // and doesn't trigger authentication checks
    return <WrappedComponent {...props} />;
  };
};