import React, { FC, useState } from "react";
import TextField from "@mui/material/TextField";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";

const isValidSize = (n: number) => {
  if (isNaN(n) || n <= 0) {
    return false;
  }
  if (Number.isInteger(n)) {
    return true;
  }
  const decimalPart = n - Math.floor(n);
  return decimalPart === 0.5;
};

export interface DynamicTableFilterProps {
  skuFilter: string;
  setSkuFilter: React.Dispatch<React.SetStateAction<string>>;
  sizeFilter: Set<number>;
  setSizeFilter: React.Dispatch<React.SetStateAction<Set<number>>>;
}

const DynamicTableFilter: FC<DynamicTableFilterProps> = ({
  skuFilter,
  setSkuFilter,
  sizeFilter,
  setSizeFilter,
}) => {
  const [sizeTextFieldValue, setSizeTextFieldValue] = useState<string>("");

  const handleSizeChipDelete = (size: number) => {
    const sizeFilterCopy = new Set(sizeFilter);
    sizeFilterCopy.delete(size);
    setSizeFilter(sizeFilterCopy);
  };

  const handleSizeTextFieldKeyPress = (event) => {
    if (event.key === "Enter") {
      if (isValidSize(Number(sizeTextFieldValue))) {
        const sizeFilterCopy = new Set(sizeFilter);
        sizeFilterCopy.add(Number(sizeTextFieldValue));
        setSizeFilter(sizeFilterCopy);
      }
      setSizeTextFieldValue("");
    }
  };

  return (
    <Box sx={{ width: "100%", padding: "20px", flexGrow: 1 }}>
      <Grid container spacing={2}>
        <Grid item xs={2}>
          <TextField
            id="outlined-basic"
            label="SKU"
            variant="outlined"
            fullWidth
            value={skuFilter}
            onChange={(e) => {
              setSkuFilter(e.target.value);
            }}
          />
        </Grid>
        <Grid item xs={1}>
          <TextField
            id="outlined-basic"
            label="Sizes"
            variant="outlined"
            type="number"
            value={sizeTextFieldValue}
            onChange={(e) => {
              setSizeTextFieldValue(e.target.value);
            }}
            onKeyDown={handleSizeTextFieldKeyPress}
          />
        </Grid>
        <Grid item xs={0.5}>
          <Button onClick={() => setSizeFilter(new Set())}>Clear</Button>
        </Grid>
        <Grid item xs={8}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            {Array.from(sizeFilter).map((s) => (
              <Chip
                key={s}
                label={s}
                onDelete={() => handleSizeChipDelete(s)}
              />
            ))}
          </Stack>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DynamicTableFilter;
