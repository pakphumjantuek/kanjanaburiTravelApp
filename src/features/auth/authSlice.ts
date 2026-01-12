import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import type { UserProfile } from "./authTypes";
import { getAccessToken, getRefreshToken, setAccessToken, setRefreshToken, clearTokens } from "../../utils/tokenStorage";

export interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  hydrated: false,
};

export const hydrateAuth = createAsyncThunk("auth/hydrate", async () => {
  const [accessToken, refreshToken] = await Promise.all([
    getAccessToken(),
    getRefreshToken(),
  ]);
  return { accessToken, refreshToken };
});

type SetAuthPayload = {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth(state, action: PayloadAction<SetAuthPayload>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    },
    clearAuth(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(hydrateAuth.fulfilled, (state, action) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.hydrated = true;
    });
    builder.addCase(hydrateAuth.rejected, (state) => {
      state.hydrated = true;
    });
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;

// thunks สำหรับ persist
export const persistAuth =
  (payload: SetAuthPayload) => async (dispatch: any) => {
    dispatch(setAuth(payload));
    await Promise.all([
      setAccessToken(payload.accessToken),
      setRefreshToken(payload.refreshToken),
    ]);
  };

export const persistClearAuth = () => async (dispatch: any) => {
  dispatch(clearAuth());
  await clearTokens();
};
