import React, { useEffect, useState } from 'react'
import Button from '@mui/material/Button'
import InputLabel from '@mui/material/InputLabel'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import DataTable from './DataTable'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Autocomplete from '@mui/material/Autocomplete'
import CircularProgress from '@mui/material/CircularProgress'

function MovieRecommender() {
  const [user, setUser] = useState({})
  const [userAuto, setUserAuto] = useState([])
  const [similarity, setSimilarity] = useState('Euclidian')
  const [type, setType] = useState('Fork')
  const [numResults, setNumResults] = useState(10)
  const [recommendationContent, setRecommendationContent] = useState('')
  const [loadingContent, setLoadingContent] = useState('')
  const [minNumRatings, setMinNumRatings] = useState(1)
  const [numThreads, setNumThreads] = useState(4)
  const [infoContent, setInfoContent] = useState('')
  const [disabledButton, setdisabledButton] = useState(false)
  const [rev, setRev] = useState(0)

  const defaultProps = {
    options: userAuto,
    getOptionLabel: (option) => `${option.id}: ${option.name}`,
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
      setLoadingContent(
        <div>
          <p style={{ fontSize: '22px' }}>{loadingString}</p>
          <CircularProgress />
        </div>
      )
    }, 200)

    const result = await fetch(`http://localhost:4000/recommendations/users/${user.id}?sim=${similarity}&results=${numResults}`, {})
    await result.json().then((json) => {
      clearInterval(loadingUpdateInterval)
      setLoadingContent(null)

      setRecommendationContent(<DataTable cells={['Name', 'ID', 'Similarity']} rows={json.similarUsers}></DataTable>)
    })
  }

  const handleMoviesButtonClick = async (event) => {
    setRecommendationContent(null)
    setInfoContent(null)
    setdisabledButton(true)

    let loadingString = 'Loading'
    let loadingUpdateInterval = setInterval(() => {
      loadingString += '.'
      if (loadingString.length > 12) {
        loadingString = 'Loading.'
      }
      setLoadingContent(
        <div>
          <p style={{ fontSize: '22px' }}>{loadingString}</p>
          <CircularProgress />
        </div>
      )
    }, 200)

    const t0 = performance.now()
    const result = await fetch(
      `http://localhost:4000/recommendations/movies/${user.id}?sim=${similarity}&results=${numResults}&minratings=${minNumRatings}&numthreads=${numThreads}&type=${type}&rev=${rev}`,
      {}
    )
    await result.json().then((json) => {
      const t1 = performance.now()
      setInfoContent(
        <span style={{ fontSize: '14px' }}>
          Listing the {json.userMovieRecommendations.length} highest scores. In total calculated {json.totalRecommendations} recommendations in
          {t1 - t0} milliseconds.
        </span>
      )
      clearInterval(loadingUpdateInterval)
      setLoadingContent(null)
      setdisabledButton(false)

      if (json.userMovieRecommendations.length > 0) {
        setRecommendationContent(<DataTable cells={['Movie', 'ID', 'Ratings', 'Score']} rows={json.userMovieRecommendations}></DataTable>)
      } else {
        setRecommendationContent(<p>No movies could currently be recommended, sorry. Try again later!</p>)
      }
    })
  }

  useEffect(() => {
    ;(async () => {
      const result = await fetch('http://localhost:4000/users', {})
      const json = await result.json()

      let autoArr = []
      for (let i = 0; i < json.users.length; i++) {
        autoArr.push({ id: json.users[i].userId, name: json.users[i].name })
      }

      setUserAuto(autoArr)
      setUser(autoArr[0])
    })()
  }, [])
  // Stack justifyContent={'flex-start'} alignItems='' spacing={1} alignContent=''
  return (
    <Stack
      padding={0}
      sx={{
        paddingTop: 2,
        height: '100vh',
        width: '100vw',
        margin: 0,
      }}
    >
      <Stack
        display={'flex'}
        spacing={3}
        alignSelf={'center'}
        direction={'column'}
        margin={0}
        sx={{ height: '100vh', width: '90%', maxWidth: '1000px' }}
      >
        <Stack direction={'row'} alignItems={'center'} justifyContent={'baseline'} spacing={3} sx={{}}>
          <FormControl variant='standard' sx={{ m: 0, minWidth: 120 }}>
            <Autocomplete
              {...defaultProps}
              id='auto-complete'
              autoComplete
              disableClearable
              autoHighlight
              style={{}}
              value={user}
              onChange={(event, newValue) => {
                setUser(newValue)
                console.log(newValue)
              }}
              renderInput={(params) => <TextField sx={{ m: 0, minWidth: 120 }} {...params} label='User' variant='standard' />}
            />
          </FormControl>

          <FormControl variant='standard' sx={{ m: 0 }}>
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

          <FormControl variant='standard' sx={{ m: 0, maxWidth: 120 }}>
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

          <FormControl variant='standard' sx={{ m: 0, maxWidth: 120 }}>
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

          <FormControl variant='standard' sx={{ m: 0, maxWidth: 100 }}>
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

          <FormControl variant='standard' sx={{ m: 0, maxWidth: 120 }}>
            <InputLabel id='select-type-label'>Type</InputLabel>
            <Select label='Type' style={{}} labelId='select-type-label' id='select-type' value={type} onChange={handleTypeChange}>
              <MenuItem value='Fork'>Fork</MenuItem>
              <MenuItem value='Worker'>Worker</MenuItem>
              <MenuItem value='Slow'>Slow</MenuItem>
            </Select>
          </FormControl>
          <FormControl variant='standard' sx={{ m: 0, maxWidth: 120 }}>
            <InputLabel id='select-rev-label'>Rev data</InputLabel>
            <Select
              label='Rev'
              style={{}}
              labelId='select-rev-label'
              id='select-rev'
              value={rev}
              onChange={(event, newValue) => {
                setRev(event.target.value)
              }}
            >
              <MenuItem value='0'>False</MenuItem>
              <MenuItem value='1'>True</MenuItem>
            </Select>
          </FormControl>
        </Stack>

        <Stack direction='row' sx={{}} spacing={3}>
          <Button
            disabled={disabledButton}
            onClick={handleMoviesButtonClick}
            style={{ backgroundColor: '#42a5f5', color: 'white' }}
            variant='contained'
          >
            Find recommended movies
          </Button>

          <Button onClick={handleUsersButtonClick} style={{ backgroundColor: '#42a5f5', color: 'white' }} variant='contained'>
            Find recommended users
          </Button>
        </Stack>

        <Stack sx={{ m: 0 }}>
          <div style={{}}>
            {loadingContent}
            {infoContent}
            {recommendationContent}
          </div>
        </Stack>
      </Stack>
    </Stack>
  )
}

export default MovieRecommender
