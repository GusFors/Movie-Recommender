#include "../node_modules/nan/nan.h"
#include "v8-typed-array.h"
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <stddef.h>
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

void calc_num_ratings(int *mov_id_arr, int *rating_id_arr, size_t mov_len, size_t rating_len, int *num_rating_arr) {
  int is_curr_mov_id = 0;
  int already_checked_indexes = 0;

  for (size_t i = 0; i < mov_len; i++) {
    int num_ratings = 0;
    for (size_t y = already_checked_indexes; y < rating_len; y++) {
      if (rating_id_arr[y] == mov_id_arr[i]) {
        if (is_curr_mov_id == 0) {
          is_curr_mov_id = 1;
          already_checked_indexes = y;
        }
        num_ratings++;
      } else if (is_curr_mov_id && rating_id_arr[y] != mov_id_arr[i]) {
        is_curr_mov_id = 0;
        break;
      }
    }
    num_rating_arr[i] = num_ratings;
  }
}

NAN_METHOD(getNumRatings) {
  v8::Local<v8::Array> rating_id_array = v8::Local<v8::Array>::Cast(info[0]);
  Nan::TypedArrayContents<int> rating_id_array_typed(rating_id_array);
  int *r_id = *rating_id_array_typed;

  v8::Local<v8::Array> mov_id_array = v8::Local<v8::Array>::Cast(info[1]);
  Nan::TypedArrayContents<int> mov_id_array_typed(mov_id_array);
  int *m_id = *mov_id_array_typed;

  v8::Local<v8::ArrayBuffer> num_ratings_buffer = v8::ArrayBuffer::New(info.GetIsolate(), mov_id_array_typed.length() * sizeof(int));
  v8::Local<v8::Int32Array> num_ratings_array = v8::Int32Array::New(num_ratings_buffer, 0, mov_id_array_typed.length());
  Nan::TypedArrayContents<int> num_ratings_arr_typed(num_ratings_array);
  int *num_data = *num_ratings_arr_typed;
  printf("addon calc num ratings\n");

  size_t r_len = rating_id_array_typed.length();
  size_t m_len = mov_id_array_typed.length();

  printf("%zu mlen, %zu rlen\n", m_len, r_len);
  clock_t t1;
  t1 = clock();
  calc_num_ratings(m_id, r_id, m_len, r_len, num_data);

  clock_t t2 = clock() - t1;
  double total = ((double)t2) / CLOCKS_PER_SEC;
  printf("addon getNumRatings done in %f seconds\n", total);

  info.GetReturnValue().Set(num_ratings_array);
}

NAN_METHOD(getNumRatingsCopy) {
  v8::Local<v8::Array> rating_id_array = v8::Local<v8::Array>::Cast(info[0]);
  Nan::TypedArrayContents<int> rating_id_array_typed(rating_id_array);
  int *r_id = *rating_id_array_typed;

  v8::Local<v8::Array> mov_id_array = v8::Local<v8::Array>::Cast(info[1]);
  Nan::TypedArrayContents<int> mov_id_array_typed(mov_id_array);
  int *m_id = *mov_id_array_typed;

  v8::Local<v8::ArrayBuffer> num_ratings_buffer = v8::ArrayBuffer::New(info.GetIsolate(), mov_id_array_typed.length() * sizeof(int));
  v8::Local<v8::Int32Array> num_ratings_array = v8::Int32Array::New(num_ratings_buffer, 0, mov_id_array_typed.length());
  Nan::TypedArrayContents<int> num_ratings_arr_typed(num_ratings_array);
  int *num_data = *num_ratings_arr_typed;
  printf("addon calc num ratings copy\n");

  size_t r_len = rating_id_array_typed.length();
  size_t m_len = mov_id_array_typed.length();

  int *rating_id_array_copy = (int *)malloc(r_len * sizeof(int));
  int *mov_id_array_copy = (int *)malloc(m_len * sizeof(int));

  if (rating_id_array_copy == NULL || mov_id_array_copy == NULL) {
    printf("malloc error\n");
    exit(1);
  }

  for (int i = 0; i < r_len; i++) {
    rating_id_array_copy[i] = r_id[i];
  }

  for (int i = 0; i < m_len; i++) {
    mov_id_array_copy[i] = m_id[i];
  }

  printf("%zu mlen, %zu rlen\n", m_len, r_len);
  clock_t t1;
  t1 = clock();

  calc_num_ratings((int *)mov_id_array_copy, (int *)rating_id_array_copy, m_len, r_len, num_data);

  // int is_curr_mov_id = 0;
  // int already_checked_indexes = 0;

  // for (int i = 0; i < m_len; i++) {
  //   int num_ratings = 0;
  //   for (int y = already_checked_indexes; y < r_len; y++) {
  //     if (rating_id_array_copy[y] == mov_id_array_copy[i]) {
  //       if (is_curr_mov_id == 0) {
  //         is_curr_mov_id = 1;
  //         already_checked_indexes = y;
  //       }
  //       num_ratings++;
  //     } else if (is_curr_mov_id && rating_id_array_copy[y] != mov_id_array_copy[i]) {
  //       is_curr_mov_id = 0;
  //       break;
  //     }
  //   }
  //   num_data[i] = num_ratings;
  // }

  clock_t t2 = clock() - t1;
  double total = ((double)t2) / CLOCKS_PER_SEC;
  printf("addon getNumRatings done in %f seconds\n", total);

  free(rating_id_array_copy);
  free(mov_id_array_copy);

  info.GetReturnValue().Set(num_ratings_array);
}

void init(Nan ::ADDON_REGISTER_FUNCTION_ARGS_TYPE target) {
  Nan::SetMethod(target, "getNumRatings", getNumRatings);
  Nan::SetMethod(target, "getNumRatingsCopy", getNumRatingsCopy);
}
NAN_MODULE_WORKER_ENABLED(addonCalculations, init)
