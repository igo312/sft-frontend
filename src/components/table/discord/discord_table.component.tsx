import React, { useEffect, useMemo, FC, useState } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import EnhancedTableHead from "@components/table/discord/discord_table_head.component";
import { fetchDiscordMessage } from "@external/discord/fetch_message";
import { ChannelId, DiscordTableData } from "@external/discord/discord.type";
import {
  Order,
  getComparator,
  stableSort,
} from "@components/table/table.common";

const EnhancedTable: FC = () => {
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof DiscordTableData>("date");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [rows, setRows] = useState<DiscordTableData[]>([]);

  const populateDiscordTable = async () => {
    const data = await fetchDiscordMessage(ChannelId.NIKE_US);
    const rows: DiscordTableData[] = data
      .map((d) => ({
        id: d.id,
        title: d.title,
        retailPrice: d.retailPrice,
        sku: d.sku,
        stockXLink: d.stockXLink,
        goatLink: d.goatLink,
        availableSizes: Object.keys(d.availableSizes).toString(),
        date: d.date,
      }));
    setRows(rows);
  };

  useEffect(() => {
    populateDiscordTable();
  }, []);

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof DiscordTableData
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Avoid a layout jump when reaching the last page with empty rows.
  const emptyRows =
    page > 0 ? Math.max(0, (1 + page) * rowsPerPage - rows.length) : 0;

  const visibleRows = React.useMemo(
    () =>
      stableSort(rows, getComparator(order, orderBy)).slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
      ),
    [order, orderBy, page, rowsPerPage, rows]
  );

  return (
    <Box sx={{ width: "100%" }}>
      <Paper sx={{ width: "100%", mb: 2 }}>
        <TableContainer>
          <Table
            sx={{ minWidth: 750 }}
            aria-labelledby="tableTitle"
            size={"medium"}
          >
            <EnhancedTableHead
              order={order}
              orderBy={orderBy}
              onRequestSort={handleRequestSort}
              rowCount={rows.length}
            />
            <TableBody>
              {visibleRows.map((row, index) => {
                const labelId = `enhanced-table-checkbox-${index}`;

                const formattedDate = new Intl.DateTimeFormat("en-US", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZoneName: "short",
                }).format(new Date(row.date));

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={row.id}
                    sx={{ cursor: "pointer" }}
                  >
                    <TableCell padding="checkbox"></TableCell>
                    <TableCell
                      component="th"
                      id={labelId}
                      scope="row"
                      padding="none"
                    >
                      {row.sku}
                    </TableCell>
                    <TableCell align="left">{row.title}</TableCell>
                    <TableCell align="center">{row.retailPrice}</TableCell>
                    <TableCell align="left">{row.stockXLink}</TableCell>
                    <TableCell align="left">{row.goatLink}</TableCell>
                    <TableCell align="left">{row.availableSizes}</TableCell>
                    <TableCell align="left">{formattedDate}</TableCell>
                  </TableRow>
                );
              })}
              {emptyRows > 0 && (
                <TableRow
                  style={{
                    height: 53 * emptyRows,
                  }}
                >
                  <TableCell colSpan={6} />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={rows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Paper>
    </Box>
  );
};

export default EnhancedTable;
