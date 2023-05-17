import React, { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import DataTable from './DataTable'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'

function MovieRecommender() {
  const [user, setUser] = useState('')
  const [userOptions, setUserOptions] = useState('')
  const [similarity, setSimilarity] = useState('Euclidian')
  const [numResults, setNumResults] = useState(3)
  const [recommendationContent, setRecommendationContent] = useState('')
  const [loadingContent, setLoadingContent] = useState('')
  const [minNumRatings, setMinNumRatings] = useState(1)
  const [numForks, setNumForks] = useState(4)
  const [infoContent, setInfoContent] = useState('')

  const handleUserChange = (event) => {
    setUser(event.target.value)
  }

  const handleSimilarityChange = (event) => {
    setSimilarity(event.target.value)
  }

  const handleNumResultsChange = (event) => {
    setNumResults(event.target.value)
  }

  const handleMinNumRatingsChange = (event) => {
    setMinNumRatings(event.target.value)
  }

  const handleNumForksChange = (event) => {
    setNumForks(event.target.value)
  }

  const handleUsersButtonClick = async (event) => {
    setRecommendationContent(null)
    setInfoContent(null)

    let loadingString = 'Loading'
    let loadingUpdateInterval = setInterval(() => {
      loadingString += '.'
      if (loadingString.length > 12) {
        loadingString = 'Loading.'
      }
      setLoadingContent(<p style={{ fontSize: '22px' }}>{loadingString}</p>)
    }, 200)

    const result = await fetch(`http://localhost:4000/recommendations/users/${user}?sim=${similarity}&results=${numResults}`, {})
    const json = await result.json().then((json) => {
      clearInterval(loadingUpdateInterval)
      setLoadingContent(null)

      setRecommendationContent(<DataTable cells={['Name', 'ID', 'Similarity']} rows={json.similarUsers}></DataTable>)
    })
  }

  const handleMoviesButtonClick = async (event) => {
    setRecommendationContent(null)
    setInfoContent(null)
    
    let loadingString = 'Loading'
    let loadingUpdateInterval = setInterval(() => {
      loadingString += '.'
      if (loadingString.length > 12) {
        loadingString = 'Loading.'
      }
      setLoadingContent(<p style={{ fontSize: '22px' }}>{loadingString}</p>)
    }, 200)

    const t0 = performance.now()
    const result = await fetch(
      `http://localhost:4000/recommendations/movies/${user}?sim=${similarity}&results=${numResults}&minratings=${minNumRatings}&numforks=${numForks}`,
      {}
    )
    const json = await result.json().then((json) => {
      const t1 = performance.now()
      setInfoContent(<span style={{ fontSize: '14px' }}> Fetched recommendations in {t1 - t0} milliseconds.</span>)
      clearInterval(loadingUpdateInterval)
      setLoadingContent(null)

      if (json.userMovieRecommendations.length > 0) {
        setRecommendationContent(<DataTable cells={['Movie', 'ID', 'Ratings', 'Score']} rows={json.userMovieRecommendations}></DataTable>)
      } else {
        setRecommendationContent(<p>No movies could currently be recommended, sorry. Try again later!</p>)
      }
    })
  }

  useEffect(() => {
    ;(async () => {
      {
        const result = await fetch('http://localhost:4000/users', {})
        const json = await result.json()

        setUserOptions(
          json.users.map((user) => {
            return (
              <MenuItem value={user.userId}>
                {user.userId}: {user.name}
              </MenuItem>
            )
          })
        )
      }
    })()
  }, [])

  return (
    <Container>
      <div style={{}}>
        <div style={{}}>
          <Stack alignContent='start' direction='row' spacing={0}>
            <FormControl variant='standard' sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id='select-user-label'>User</InputLabel>
              <Select
                label='User'
                style={{ minWidth: '100px', borderRadius: '4px', marginRight: '30px' }}
                labelId='select-user-label'
                id='select-user'
                value={user}
                onChange={handleUserChange}
              >
                <MenuItem value=''>
                  <em>None</em>
                </MenuItem>
                {userOptions}
              </Select>
            </FormControl>
            <FormControl variant='standard' sx={{ m: 1, minWidth: 120 }}>
              <InputLabel id='select-similarity-label'>Similarity</InputLabel>
              <Select
                label='Similarity'
                style={{ minWidth: '100px', borderRadius: '4px', marginRight: '30px' }}
                labelId='select-similarity-label'
                id='select-similarity'
                value={similarity}
                onChange={handleSimilarityChange}
              >
                <MenuItem value='Euclidian'>Euclidian</MenuItem>
                <MenuItem value='Pearson'>Pearson</MenuItem>
              </Select>
            </FormControl>
            <FormControl variant='standard' sx={{ m: 1, minWidth: 120 }}>
              <TextField
                id='standard-number'
                label='Number of results'
                type='number'
                style={{ minWidth: '100px', borderRadius: '4px', marginRight: '30px' }}
                defaultValue='3'
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={handleNumResultsChange}
                variant='standard'
              />
            </FormControl>
            <FormControl variant='standard' sx={{ m: 1, minWidth: 120 }}>
              <TextField
                id='standard-number-results'
                label='Min number of ratings'
                type='number'
                style={{ minWidth: '100px', borderRadius: '4px', marginRight: '30px' }}
                defaultValue='1'
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={handleMinNumRatingsChange}
                variant='standard'
              />
            </FormControl>
            <FormControl variant='standard' sx={{ m: 1, minWidth: 120 }}>
              <TextField
                id='standard-forks-results'
                label='Forks'
                type='number'
                style={{ minWidth: '20px', borderRadius: '4px', marginRight: '40px' }}
                defaultValue='4'
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={handleNumForksChange}
                variant='standard'
              />
            </FormControl>
          </Stack>
          <div style={{marginTop: '20px'}}>
            <Button onClick={handleMoviesButtonClick} style={{ backgroundColor: '#42a5f5', color: 'white', marginRight: '40px' }} variant='contained'>
              Find recommended movies
            </Button>
            <Button onClick={handleUsersButtonClick} style={{ backgroundColor: '#42a5f5', color: 'white' }} variant='contained'>
              Find recommended users
            </Button>
          </div>
        </div>
        <div></div>
        <div style={{ marginTop: '40px' }}>
          {loadingContent}
          <div style={{ marginTop: '20px', marginBottom: '20px' }}>{infoContent}</div>
          {recommendationContent}
        </div>
      </div>
    </Container>
  )
}

export default MovieRecommender
