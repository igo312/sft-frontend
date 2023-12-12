import * as React from "react";
import Box from "@mui/material/Box";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import { visuallyHidden } from "@mui/utils";
import { GoatCatalogTableData } from "@external/goat/goat.types";


type Order = "asc" | "desc";

interface HeadCell {
  disablePadding: boolean;
  id: keyof GoatCatalogTableData;
  label: string;
  numeric: boolean;
}
const headCells: readonly HeadCell[] = [
  {
    id: "sku",
    numeric: false,
    disablePadding: false,
    label: "SKU",
  },
  {
    id: "title",
    numeric: false,
    disablePadding: false,
    label: "Title",
  },
  {
    id: "size",
    numeric: true,
    disablePadding: false,
    label: "Size",
  },
  {
    id: "retailPrice",
    numeric: true,
    disablePadding: false,
    label: "Retail Price",
  },
  {
    id: "sellingPrice",
    numeric: true,
    disablePadding: false,
    label: "Lowest Listing Price",
  },
  {
    id: "profit",
    numeric: true,
    disablePadding: false,
    label: "Profit",
  },
  {
    id: "goatLink",
    numeric: false,
    disablePadding: false,
    label: "Goat Link",
  },
  {
    id: "retailLink",
    numeric: false,
    disablePadding: false,
    label: "Retail Link",
  },
  {
    id: "discordMessageDate",
    numeric: true,
    disablePadding: false,
    label: "Discord Message Date",
  },
];

interface EnhancedTableProps {
  onRequestSort: (
    event: React.MouseEvent<unknown>,
    property: keyof GoatCatalogTableData
  ) => void;
  order: Order;
  orderBy: string;
  rowCount: number;
}

function EnhancedTableHead(props: EnhancedTableProps) {
  const {
    order,
    orderBy,
    rowCount,
    onRequestSort,
  } = props;
  const createSortHandler =
    (property: keyof GoatCatalogTableData) => (event: React.MouseEvent<unknown>) => {
      onRequestSort(event, property);
    };

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="checkbox">
        </TableCell>
        {headCells.map((headCell) => (
          <TableCell
            key={headCell.id}
            align={headCell.numeric ? "right" : "left"}
            padding={headCell.disablePadding ? "none" : "normal"}
            sortDirection={orderBy === headCell.id ? order : false}
          >
            <TableSortLabel
              active={orderBy === headCell.id}
              direction={orderBy === headCell.id ? order : "asc"}
              onClick={createSortHandler(headCell.id)}
            >
              {headCell.label}
              {orderBy === headCell.id ? (
                <Box component="span" sx={visuallyHidden}>
                  {order === "desc" ? "sorted descending" : "sorted ascending"}
                </Box>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  );
}

export default EnhancedTableHead;