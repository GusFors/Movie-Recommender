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

NAN_METHOD(getRatings) {
  int file_size = Nan::To<int>(info[0]).FromJust();
  int line_skip = Nan::To<int>(info[1]).FromJust();
  char *file_path = (*Nan::Utf8String(info[2]));

  printf("%d size arg, %d lineskip, path %s\n", file_size, line_skip, file_path);

  FILE *rating_file;
  rating_file = fopen(file_path, "r");

  if (rating_file == NULL) {
    printf("error reading file");
    exit(1);
  }

  int *user_ids = (int *)malloc(file_size * sizeof(int));
  int *movie_ids = (int *)malloc(file_size * sizeof(int));
  float *ratings = (float *)malloc(file_size * sizeof(float));

  if (user_ids == NULL || movie_ids == NULL || ratings == NULL) {
    printf("malloc error\n");
    exit(1);
  }

  int assigned_items = 0;
  int line_count = 0;

  if (line_skip == 1) {
    printf("lineskip 1\n");
    fscanf(rating_file, "%*[^\n]"); // skip first line

    if (file_size != 120) {
      while (!feof(rating_file)) {
        assigned_items = fscanf(rating_file, "%d,%d,%f,%*d\n", &user_ids[line_count], &movie_ids[line_count], &ratings[line_count]);
        if (assigned_items == 3) {
          line_count++;
        }
      }
    } else {
      printf("debug data\n");
      while (!feof(rating_file)) {
        assigned_items = fscanf(rating_file, "%d;%d;%f\n", &user_ids[line_count], &movie_ids[line_count], &ratings[line_count]);
        if (assigned_items == 3) {
          line_count++;
        }
      }
    }

  } else {
    printf("lineskip 0\n");

    while (!feof(rating_file)) {
      assigned_items = fscanf(rating_file, "%d::%d::%f::%*d\n", &user_ids[line_count], &movie_ids[line_count], &ratings[line_count]);
      if (assigned_items == 3) {
        line_count++;
        if (line_count == 1) {
          printf("%d,%d,%.1f\n", user_ids[0], movie_ids[0], ratings[0]);
        }
      }
    }

    // while (!feof(file)) {
    //   assigned_items = fscanf(file, "%d;%d;%f\n", &user_ids[line_count], &movie_ids[line_count], &ratings[line_count]);
    //   if (assigned_items == 3) {
    //     line_count++;
    //   }
    // }
  }

  fclose(rating_file);
  printf("\n%d lines\n", line_count);

  // for (int i = 0; i < line_count; i++) {
  //   printf("%d,%d,%.1f\n", ratingsp[i].user_id, ratingsp[i].movie_id,
  //          ratingsp[i].rating);
  // }

  // for (int i = 0; i < line_count; i++) {
  //   printf("%d,%d,%.1f\n", user_ids[i], movie_ids[i], ratings[i]);
  // }

  v8::Local<v8::ArrayBuffer> user_ids_buffer = v8::ArrayBuffer::New(info.GetIsolate(), file_size * sizeof(int));
  v8::Local<v8::Int32Array> user_ids_array = v8::Int32Array::New(user_ids_buffer, 0, file_size);
  Nan::TypedArrayContents<int> utyped(user_ids_array);
  int *udata = *utyped;

  for (int i = 0; i < line_count; i++) {
    udata[i] = user_ids[i];
  }

  v8::Local<v8::ArrayBuffer> movie_ids_buffer = v8::ArrayBuffer::New(info.GetIsolate(), file_size * sizeof(int));
  v8::Local<v8::Int32Array> movie_ids_array = v8::Int32Array::New(movie_ids_buffer, 0, file_size);
  Nan::TypedArrayContents<int> mtyped(movie_ids_array);
  int *mdata = *mtyped;

  for (int i = 0; i < line_count; i++) {
    mdata[i] = movie_ids[i];
  }

  v8::Local<v8::ArrayBuffer> ratings_buffer = v8::ArrayBuffer::New(info.GetIsolate(), file_size * sizeof(float));
  v8::Local<v8::Float32Array> ratings_array = v8::Float32Array::New(ratings_buffer, 0, file_size);
  Nan::TypedArrayContents<float> rtyped(ratings_array);
  float *rdata = *rtyped;

  for (int i = 0; i < line_count; i++) {
    rdata[i] = ratings[i];
  }

  // v8::MaybeLocal<v8::String> uid = v8::String::NewFromUtf8(info.GetIsolate(), "userIds");
  // v8::MaybeLocal<v8::String> mids = v8::String::NewFromUtf8(info.GetIsolate(), "movieIds");
  // v8::MaybeLocal<v8::String> r = v8::String::NewFromUtf8(info.GetIsolate(), "ratings");

  v8::Local<v8::Object> return_data = v8::Object::New(info.GetIsolate());

  Nan::Set(return_data, 0, user_ids_array);
  Nan::Set(return_data, 1, movie_ids_array);
  Nan::Set(return_data, 2, ratings_array);

  free(user_ids);
  free(movie_ids);
  free(ratings);

  info.GetReturnValue().Set(return_data);
}

struct rating {
  int user_id;
  int movie_id;
  double rating;
};

NAN_METHOD(getNumRatings) {
  clock_t t1;
  t1 = clock();

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

  int r_len = rating_id_array_typed.length();
  int m_len = mov_id_array_typed.length();

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

  printf("done\n");
  info.GetReturnValue().Set(num_ratings_array);
}

void init(Nan ::ADDON_REGISTER_FUNCTION_ARGS_TYPE target) {
  Nan::SetMethod(target, "getRatings", getRatings);
  Nan::SetMethod(target, "getNumRatings", getNumRatings);
}
NAN_MODULE_WORKER_ENABLED(addonCsvReader, init)

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