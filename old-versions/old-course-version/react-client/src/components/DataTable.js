import React from 'react'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Paper from '@mui/material/Paper'

function DataTable({ rows = [], cells = [] }) {
  return (
    <TableContainer component={Paper}>
      <Table style={{}} sx={{ minWidth: 650 }} aria-label='simple table'>
        <TableHead>
          <TableRow>
            <TableCell>{cells[0]}</TableCell>
            <TableCell align='right'>{cells[1]}</TableCell>
            <TableCell align='right'>{cells[2]}</TableCell>
            {cells[3] ? <TableCell align='right'>{cells[3]}</TableCell> : null}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.name} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
              <TableCell component='th' scope='row'>
                {row.title ? row.title : row.name}
              </TableCell>
              <TableCell align='right'>{row.movieId ? row.movieId : row.userId}</TableCell>
              {row.numRatings ? <TableCell align='right'>{row.numRatings ? row.numRatings : null}</TableCell> : null}
              <TableCell align='right'>{row.recommendationScore ? row.recommendationScore.toFixed(4) : row.similarity}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}

export default DataTable
