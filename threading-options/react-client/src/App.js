import React, { useMemo } from 'react'
import './App.css'
import MovieRecommender from './components/MovieRecommender'
import useMediaQuery from '@mui/material/useMediaQuery'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { InputBase } from '@mui/material'

function App() {
  const prefersDarkMode = useMediaQuery('(prefers-color-scheme: dark)')
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? 'dark' : 'light',
        },
        components: {
          MuiSelect: {
            styleOverrides: {},
          },
          MuiTextField: {
            styleOverrides: {},
          },
          MuiInputBase: {
            styleOverrides: {},
          },
          MuiSlider: {
            styleOverrides: {
              valueLabel: {},
            },
          },
        },
        transitions: { duration: '0' },
      }),
    [prefersDarkMode]
  )

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <div className='App'>
        <header className='App-header'>
          <MovieRecommender></MovieRecommender>
        </header>
      </div>
    </ThemeProvider>
  )
}

export default App
