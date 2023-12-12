import React, { useEffect, useMemo, FC, useState } from "react";
import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import EnhancedTableHead from "@components/table/goat/goat_table_head.component";
import { fetchDiscordMessage } from "@external/discord/fetch_message";
import {
  GoatCatalogTableData,
  GoatPackageCondition,
  GoatPricing,
  GoatProductCondition,
} from "@external/goat/goat.types";
import { ChannelId, DiscordMessage } from "@external/discord/discord.type";
import {
  getGoatCatalogFromSku,
  getPricingInsight,
} from "@external/goat/api_calls";
import {
  Order,
  getComparator,
  stableSort,
} from "@components/table/table.common";

const MAX_ROW = 1;

const toTwoDecimal = (num: number): number =>
  Number((Math.round(num * 100) / 100).toFixed(2));

const EnhancedTable: FC = () => {
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof GoatCatalogTableData>("profit");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);

  const [rows, setRows] = useState<GoatCatalogTableData[]>([]);

  const populateGoatTable = async () => {
    const msgs: DiscordMessage[] = await fetchDiscordMessage(ChannelId.NIKE_US);
    const goatData: GoatCatalogTableData[] = [];
    for (let i = 0; i < Math.min(MAX_ROW, msgs.length); i++) {
      const msg = msgs[i];
      const goatCatalog = await getGoatCatalogFromSku(msg.sku);
      const retailPrice = msg.retailPrice;
      const availableSizeSet = new Set(
        Object.keys(msg.availableSizes).map((x) => Number(x))
      );
      if (goatCatalog) {
        const pricingInsights: GoatPricing[] = await getPricingInsight(
          goatCatalog.catalogId
        );
        goatData.push(
          ...pricingInsights
            .filter(
              (pricing) =>
                pricing.condition === GoatProductCondition.NEW &&
                pricing.packageCondition === GoatPackageCondition.GOOD &&
                availableSizeSet.has(pricing.size)
            )
            .map((pricing) => ({
              sku: msg.sku,
              title: msg.title,
              size: pricing.size,
              retailPrice: retailPrice,
              sellingPrice: pricing.lowestListingPrice,
              profit: toTwoDecimal(pricing.lowestListingPrice - retailPrice),
              retailLink: msg.availableSizes[pricing.size],
              goatLink: msg.goatLink,
              discordMessageDate: msg.date,
            }))
        );
      }
    }
    setRows(goatData);
  };

  useEffect(() => {
    populateGoatTable();
  }, []);

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: keyof GoatCatalogTableData
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
                }).format(new Date(row.discordMessageDate));

                return (
                  <TableRow
                    hover
                    role="checkbox"
                    tabIndex={-1}
                    key={`${row.sku} - ${row.size}`}
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
                    <TableCell align="center">{row.size}</TableCell>
                    <TableCell align="center">{row.retailPrice}</TableCell>
                    <TableCell align="center">{row.sellingPrice}</TableCell>
                    <TableCell align="center">{row.profit}</TableCell>
                    <TableCell align="left">
                      <a href={row.goatLink.toString()} target="_blank">
                        {row.goatLink}
                      </a>
                    </TableCell>
                    <TableCell align="left">
                      <a href={row.retailLink.toString()} target="_blank">
                        {row.retailLink}
                      </a>
                    </TableCell>
                    <TableCell align="right">{formattedDate}</TableCell>
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
