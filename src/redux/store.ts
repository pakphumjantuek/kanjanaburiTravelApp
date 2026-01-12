import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import { authApi } from "../features/auth/authApi";
import { homeApi } from "../features/home/homeApi";
import { placeApi } from "../features/places/placeApi";
import { behaviorApi } from "../features/behavior/behaviorApi";
import { tripApi } from "../features/trip/tripApi";
import { placeOpenApi } from "../features/placeOpening/placeOpenApi";
import { interestApi } from "../features/userinterests/interestApi";
import { roleApi } from "../features/role/roleApi";
import { placeTagApi } from "../features/placeTag/placeTagApi";
import { placeCategoryApi } from "../features/placeCategory/placeCategoryApi";
import { recommendApi } from "../features/recommend/recommendApi";
import { placeReviewApi } from "../features/placeReview/PlaceReviewApi";
import { localDishApi } from "../features/localDish/LocalDishApi";

const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [homeApi.reducerPath]: homeApi.reducer,
    [placeApi.reducerPath]: placeApi.reducer,
    [behaviorApi.reducerPath]: behaviorApi.reducer,
    [tripApi.reducerPath]: tripApi.reducer,
    [placeOpenApi.reducerPath]: placeOpenApi.reducer,
    [interestApi.reducerPath]: interestApi.reducer,
    [roleApi.reducerPath]: roleApi.reducer,
    [placeTagApi.reducerPath]: placeTagApi.reducer,
    [placeCategoryApi.reducerPath]: placeCategoryApi.reducer,
    [recommendApi.reducerPath]: recommendApi.reducer,
    [placeReviewApi.reducerPath]: placeReviewApi.reducer,
    [localDishApi.reducerPath]: localDishApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(homeApi.middleware)
      .concat(placeApi.middleware)
      .concat(behaviorApi.middleware)
      .concat(tripApi.middleware)
      .concat(placeOpenApi.middleware)
      .concat(interestApi.middleware)
      .concat(roleApi.middleware)
      .concat(placeTagApi.middleware)
      .concat(placeCategoryApi.middleware)
      .concat(recommendApi.middleware)
      .concat(placeReviewApi.middleware)
      .concat(localDishApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;

export default store;
