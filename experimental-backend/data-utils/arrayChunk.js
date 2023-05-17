'use strict'

module.exports.arrayChunkPush = function (arr, chunkCnt) {
  let chunkSize = arr.length % chunkCnt === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = c * chunkSize; i < chunkSize * (c + 1); i++) {
      temp[c].push(arr[i])
    }
  }

  if (arr.length % chunkCnt !== 0) {
    for (let r = arr.length - (arr.length % chunkCnt); r <= arr.length - 1; r++) {
      temp[temp.length - 1].push(arr[r])
    }
  }

  return temp
}

module.exports.arrayChunkShift = function (arr, chunkCnt) {
  let mod = arr.length % chunkCnt
  let chunkSize = mod === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = 0; i < chunkSize; i++) {
      temp[c].push(arr.shift())
    }
  }

  let rem = arr.length
  if (mod !== 0) {
    for (let r = 0; r < rem; r++) {
      temp[0].push(arr.shift())
    }
  }

  return temp
}

module.exports.arrayChunkPop = function (arr, chunkCnt) {
  let mod = arr.length % chunkCnt
  let chunkSize = mod === 0 ? arr.length / chunkCnt : Math.floor(arr.length / chunkCnt)

  let temp = []

  for (let c = 0; c < chunkCnt; c++) {
    temp.push([])
  }

  for (let c = 0; c < chunkCnt; c++) {
    for (let i = 0; i < chunkSize; i++) {
      temp[c].push(arr.pop())
    }
  }

  let rem = arr.length
  if (mod !== 0) {
    for (let r = 0; r < rem; r++) {
      temp[0].push(arr.pop())
    }
  }

  return temp
}
