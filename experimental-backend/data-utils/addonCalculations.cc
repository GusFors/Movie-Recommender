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

NAN_METHOD(calcNumRatings) {
  clock_t t1;
  t1 = clock();

  v8::Local<v8::Array> rating_id_array = v8::Local<v8::Array>::Cast(info[0]);
  Nan::TypedArrayContents<uint32_t> rating_id_array_typed(rating_id_array);
  uint32_t *r_id = *rating_id_array_typed;

  v8::Local<v8::Array> mov_id_array = v8::Local<v8::Array>::Cast(info[1]);
  Nan::TypedArrayContents<uint32_t> mov_id_array_typed(mov_id_array);
  uint32_t *m_id = *mov_id_array_typed;

  v8::Local<v8::ArrayBuffer> num_ratings_buffer = v8::ArrayBuffer::New(info.GetIsolate(), mov_id_array_typed.length() * sizeof(int));
  v8::Local<v8::Uint32Array> num_ratings_array = v8::Uint32Array::New(num_ratings_buffer, 0, mov_id_array_typed.length());
  Nan::TypedArrayContents<uint32_t> num_ratings_arr_typed(num_ratings_array);
  uint32_t *num_data = *num_ratings_arr_typed;
  printf("addon calc num ratings\n");

  int r_len = rating_id_array_typed.length();
  int m_len = mov_id_array_typed.length();

  printf("%d mlen, %d rlen\n", m_len, r_len);

  int is_curr_mov_id = 0;
  int already_checked_indexes = 0;

  for (int i = 0; i < m_len; i++) {
    int num_ratings = 0;
    for (int y = already_checked_indexes; y < r_len; y++) {
      if (r_id[y] == m_id[i]) {
        if (is_curr_mov_id == 0) {
          is_curr_mov_id = 1;
          already_checked_indexes = y;
        }
        num_ratings++;
      } else if (is_curr_mov_id && r_id[y] != m_id[i]) {
        is_curr_mov_id = 0;
        break;
      }
    }
    num_data[i] = num_ratings;
  }

  clock_t t2 = clock() - t1;
  double total = ((double)t2) / CLOCKS_PER_SEC;
  printf("addon getNumRatings done in %f seconds\n", total);

  info.GetReturnValue().Set(num_ratings_array);
}

NAN_METHOD(calcNumRatingsCopy) {
  clock_t t1;
  t1 = clock();

  v8::Local<v8::Array> rating_id_array = v8::Local<v8::Array>::Cast(info[0]);
  Nan::TypedArrayContents<uint32_t> rating_id_array_typed(rating_id_array);
  uint32_t *r_id = *rating_id_array_typed;

  v8::Local<v8::Array> mov_id_array = v8::Local<v8::Array>::Cast(info[1]);
  Nan::TypedArrayContents<uint32_t> mov_id_array_typed(mov_id_array);
  uint32_t *m_id = *mov_id_array_typed;

  v8::Local<v8::ArrayBuffer> num_ratings_buffer = v8::ArrayBuffer::New(info.GetIsolate(), mov_id_array_typed.length() * sizeof(int));
  v8::Local<v8::Uint32Array> num_ratings_array = v8::Uint32Array::New(num_ratings_buffer, 0, mov_id_array_typed.length());
  Nan::TypedArrayContents<uint32_t> num_ratings_arr_typed(num_ratings_array);
  uint32_t *num_data = *num_ratings_arr_typed;
  printf("addon calc num ratings copy\n");

  int r_len = rating_id_array_typed.length();
  int m_len = mov_id_array_typed.length();

  int *rating_id_array_copy = (int *)malloc(r_len * sizeof(int));
  int *mov_id_array_copy = (int *)malloc(m_len * sizeof(int));

  for (int i = 0; i < r_len; i++) {
    rating_id_array_copy[i] = r_id[i];
  }

  for (int i = 0; i < m_len; i++) {
    mov_id_array_copy[i] = m_id[i];
  }

  printf("%d mlen, %d rlen\n", m_len, r_len);

  int is_curr_mov_id = 0;
  int already_checked_indexes = 0;

  for (int i = 0; i < m_len; i++) {
    int num_ratings = 0;
    for (int y = already_checked_indexes; y < r_len; y++) {
      if (rating_id_array_copy[y] == mov_id_array_copy[i]) {
        if (is_curr_mov_id == 0) {
          is_curr_mov_id = 1;
          already_checked_indexes = y;
        }
        num_ratings++;
      } else if (is_curr_mov_id && rating_id_array_copy[y] != mov_id_array_copy[i]) {
        is_curr_mov_id = 0;
        break;
      }
    }
    num_data[i] = num_ratings;
  }

  clock_t t2 = clock() - t1;
  double total = ((double)t2) / CLOCKS_PER_SEC;
  printf("addon getNumRatings done in %f seconds\n", total);

  free(rating_id_array_copy);
  free(mov_id_array_copy);

  info.GetReturnValue().Set(num_ratings_array);
}

void init(Nan ::ADDON_REGISTER_FUNCTION_ARGS_TYPE target) {
  Nan::SetMethod(target, "calcNumRatings", calcNumRatings);
  Nan::SetMethod(target, "calcNumRatingsCopy", calcNumRatingsCopy);
}
NAN_MODULE_WORKER_ENABLED(addonCalculations, init)

// NODE_MODULE(addonCsvReader, init);

// NAN_MODULE_INIT(init) {
//   v8::Isolate *isolate = isolate;
//   AddEnvironmentCleanupHook(Nan::GetCurrentContext()->GetIsolate(),);
//   Nan::SetMethod(target, "getRatings", getRatings);
//   Nan::SetMethod(target, "getNumRatings", getNumRatings);
// }

// int64_t count = 0;
//   for (int i = 0; i < 29049; i++) {
//     int count2 = 0;
//     for (int y = 0; y < 27753444; y++) {
//       count++;
//     }
//     count2 = count;
//     m_id[i] = count;
//   }
//   // Nan::Maybe<int64_t> cov = Nan::To<int64_t>(count).FromJust()
//   printf("c loop done\n");
//   info.GetReturnValue().Set(v8::Number::New(info.GetIsolate(), count));