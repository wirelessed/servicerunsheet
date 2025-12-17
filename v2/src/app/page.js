'use client';
import { useAuth } from '../context/AuthContext';
import Login from '../components/Login';
import RunsheetList from '../components/Runsheet/RunsheetList';
import { Box, CircularProgress } from '@mui/material';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <RunsheetList />;
}
