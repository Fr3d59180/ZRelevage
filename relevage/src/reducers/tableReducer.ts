import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TableState {
  data: any[];
  headers: string[];
}

const initialState: TableState = {
  data: [],
  headers: [],
};

const tableSlice = createSlice({
  name: 'table',
  initialState,
  reducers: {
    setTableData(state, action: PayloadAction<{ data: any[]; headers: string[] }>) {
      state.data = action.payload.data;
      state.headers = action.payload.headers;
    },
  },
});

export const { setTableData } = tableSlice.actions;
export default tableSlice.reducer;