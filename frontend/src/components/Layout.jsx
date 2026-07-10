import React from 'react';
import Navigation from './Navigation';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated && <Navigation />}
      <div className={isAuthenticated ? "container-fluid" : "container-fluid"}>
        {children}
      </div>
    </>
  );
};

export default Layout;
