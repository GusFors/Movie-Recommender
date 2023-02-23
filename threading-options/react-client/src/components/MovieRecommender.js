import React, { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import Menu from '@mui/material/Menu'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import DataTable from './DataTable'
import Container from '@mui/material/Container'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import { Box } from '@mui/system'

function MovieRecommender() {
  const [user, setUser] = useState({})
  const [userOptions, setUserOptions] = useState('')
  const [userAuto, setUserAuto] = useState([])
  const [similarity, setSimilarity] = useState('Euclidian')
  const [type, setType] = useState('Fork')
  const [numResults, setNumResults] = useState(10)
  const [recommendationContent, setRecommendationContent] = useState('')
  const [loadingContent, setLoadingContent] = useState('')
  const [minNumRatings, setMinNumRatings] = useState(1)
  const [numThreads, setNumThreads] = useState(4)
  const [infoContent, setInfoContent] = useState('')
  const defaultProps = {
    options: userAuto,
    getOptionLabel: (option) => `${option.id}: ${option.name}`,
  }

  const handleUserChange = (event) => {
    console.log('userchange...')
    setUser(event.target.value)
    console.log(event.target)
    console.log(user)
  }

  const handleSimilarityChange = (event) => {
    setSimilarity(event.target.value)
  }

  const handleTypeChange = (event) => {
    setType(event.target.value)
  }

  const handleNumResultsChange = (event) => {
    setNumResults(event.target.value)
  }

  const handleMinNumRatingsChange = (event) => {
    setMinNumRatings(event.target.value)
  }

  const handleNumThreadsChange = (event) => {
    setNumThreads(event.target.value)
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

    const result = await fetch(`http://localhost:4000/recommendations/users/${user.id}?sim=${similarity}&results=${numResults}`, {})
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
      `http://localhost:4000/recommendations/movies/${user.id}?sim=${similarity}&results=${numResults}&minratings=${minNumRatings}&numthreads=${numThreads}&type=${type}`,
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
      console.log('effect')
      {
        const result = await fetch('http://localhost:4000/users', {})
        const json = await result.json()
        let userMenuArr = []
        let autoArr = []
        for (let i = 0; i < json.users.length; i++) {
          autoArr.push({ id: json.users[i].userId, name: json.users[i].name })
        }

        setUserAuto(autoArr)
        setUser(autoArr[0])
      }
    })()
  }, [])
  // Stack justifyContent={'flex-start'} alignItems='' spacing={1} alignContent=''
  return (
    <Container>
      <Box sx={{ width: '100%' }}>
        <Box sx={{ width: '100%' }}>
          <Grid container direction={'column'} alignItems={'center'} justifyContent={'center'} spacing={3}>
            <Grid container direction={'row'} alignItems={'flex-start'} justifyContent={'baseline'} spacing={3} item>
              <Grid item>
                <FormControl variant='standard' sx={{}}>
                  <Autocomplete
                    {...defaultProps}
                    id='auto-complete'
                    autoComplete
                    style={{}}
                    value={user}
                    onChange={(event, newValue) => {
                      setUser(newValue)
                      console.log(newValue)
                    }}
                    renderInput={(params) => <TextField {...params} label='User' variant='standard' />}
                  />
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl variant='standard' sx={{}}>
                  <InputLabel id='select-similarity-label'>Similarity</InputLabel>
                  <Select
                    label='Similarity'
                    style={{}}
                    labelId='select-similarity-label'
                    id='select-similarity'
                    value={similarity}
                    onChange={handleSimilarityChange}
                  >
                    <MenuItem value='Euclidian'>Euclidian</MenuItem>
                    <MenuItem value='Pearson'>Pearson</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl variant='standard' sx={{}}>
                  <TextField
                    id='standard-number'
                    label='Number of results'
                    type='number'
                    style={{}}
                    defaultValue='10'
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={handleNumResultsChange}
                    variant='standard'
                  />
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl variant='standard' sx={{}}>
                  <TextField
                    id='standard-number-results'
                    label='Min number of ratings'
                    type='number'
                    style={{}}
                    defaultValue='1'
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={handleMinNumRatingsChange}
                    variant='standard'
                  />
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl variant='standard' sx={{}}>
                  <TextField
                    id='standard-Threads-results'
                    label='Threads'
                    type='number'
                    style={{}}
                    defaultValue='4'
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={handleNumThreadsChange}
                    variant='standard'
                  />
                </FormControl>
              </Grid>
              <Grid item>
                <FormControl variant='standard' sx={{}}>
                  <InputLabel id='select-type-label'>Type</InputLabel>
                  <Select label='Type' style={{}} labelId='select-type-label' id='select-type' value={type} onChange={handleTypeChange}>
                    <MenuItem value='Fork'>Fork</MenuItem>
                    <MenuItem value='Worker'>Worker</MenuItem>
                    <MenuItem value='Slow'>Slow</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>

            <Grid container alignContent={'center'} justifyContent={'flex-start'} item>
              <Grid item container direction='row' spacing={3}>
                <Grid item>
                  <Button onClick={handleMoviesButtonClick} style={{ backgroundColor: '#42a5f5', color: 'white' }} variant='contained'>
                    Find recommended movies
                  </Button>
                </Grid>
                <Grid item>
                  <Button onClick={handleUsersButtonClick} style={{ backgroundColor: '#42a5f5', color: 'white' }} variant='contained'>
                    Find recommended users
                  </Button>
                </Grid>
              </Grid>
            </Grid>

            <Grid container alignContent={'center'} justifyContent={'flex-start'} item>
              <div style={{}}>
                {loadingContent}
                <div style={{}}>{infoContent}</div>
                {recommendationContent}
              </div>
            </Grid>
          </Grid>
        </Box>
      </Box>
    </Container>
  )
}

export default MovieRecommender
