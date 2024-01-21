#include "../node_modules/nan/nan.h"
#include <cstdint>
#include <cstdlib>
#include <iostream>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

struct rating {
  int user_id;
  int movie_id;
  double rating;
};

NAN_METHOD(getRatings) {
  // char *file_path = (*Nan::Utf8String(info[0]));

  int file_size = Nan::To<int>(info[0]).FromJust();
  int line_skip = Nan::To<int>(info[1]).FromJust();
  printf("%d size arg, %d lineskip\n", file_size, line_skip);

  FILE *rating_file;

  if (file_size == 27753444) {
    rating_file = fopen("./data/csv-data/full/ratings.csv", "r");
  } else if (file_size == 1000209) {
    rating_file = fopen("./data/csv-data/dat/ratings.csv", "r");
  } else if (file_size == 100836) {
    rating_file = fopen("./data/csv-data/small/ratings.csv", "r");
  } else if (file_size == 120) {
    rating_file = fopen("./data/csv-data/original/ratings.csv", "r");
  }

  if (rating_file == NULL) {
    printf("error reading file");
    exit(1);
  }

  // int file_size = 27753444;
  // int file_size = 35;
  // int file_size = 100836;
  // int small_size = 100836;
  // 1000209
  // int full_size = 27753446;

  int *user_ids = (int *)malloc(file_size * sizeof(int));
  int *movie_ids = (int *)malloc(file_size * sizeof(int));
  float *ratings = (float *)malloc(file_size * sizeof(float));

  if (user_ids == NULL || movie_ids == NULL || ratings == NULL) {
    printf("malloc error\n");
    exit(1);
  }

  int assigned_items = 0;
  int line_count = 0;

  if (line_skip == 0) {
    printf("lineskip 0\n");

    while (!feof(rating_file)) {
      assigned_items = fscanf(rating_file, "%d::%d::%f::%*d\n", &user_ids[line_count], &movie_ids[line_count], &ratings[line_count]);
      if (assigned_items == 3) {
        line_count++;
        // if (line_count == 1) {
        //   printf("%d,%d,%.1f\n", user_ids[0], movie_ids[0], ratings[0]);
        // }
      }
    }
  } else {
    printf("lineskip -1\n");
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
  v8::Local<v8::Uint32Array> user_ids_array = v8::Uint32Array::New(user_ids_buffer, 0, file_size);
  Nan::TypedArrayContents<uint32_t> utyped(user_ids_array);
  uint32_t *udata = *utyped;

  for (int i = 0; i < line_count; i++) {
    udata[i] = user_ids[i];
  }

  v8::Local<v8::ArrayBuffer> movie_ids_buffer = v8::ArrayBuffer::New(info.GetIsolate(), file_size * sizeof(int));
  v8::Local<v8::Uint32Array> movie_ids_array = v8::Uint32Array::New(movie_ids_buffer, 0, file_size);
  Nan::TypedArrayContents<uint32_t> mtyped(movie_ids_array);
  uint32_t *mdata = *mtyped;

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

NAN_MODULE_INIT(init) { Nan::SetMethod(target, "getRatings", getRatings); }

NODE_MODULE(addonCsvReader, init);
