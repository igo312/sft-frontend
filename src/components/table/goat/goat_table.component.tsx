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
import Tooltip from "@mui/material/Tooltip";
import QuestionMarkIcon from "@mui/icons-material/QuestionMark";
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

const MAX_MSG_TO_LOAD = 3;

const PAYOUT_ADJUSTMENT = 1;
const GOAT_FEE_RATE = [0.07, 0.029];
const GOAT_FEE_FIXED = 0;

const COST_ADJUSTMENT = 1;
const COST_DISCOUNT = [0.1, 0.1];
const COST_OTHER = 0;

const toTwoDecimal = (num: number): number =>
  Number((Math.round(num * 100) / 100).toFixed(2));

const calculatePayout = (num: number): number =>
  toTwoDecimal(
    num *
      PAYOUT_ADJUSTMENT *
      (1 - GOAT_FEE_RATE.reduce((sum, current) => sum + current, 0)) -
      GOAT_FEE_FIXED
  );

const calculateCost = (num: number): number =>
  toTwoDecimal(
    num *
      COST_ADJUSTMENT *
      (1 - COST_DISCOUNT.reduce((sum, current) => sum + current, 0)) +
      COST_OTHER
  );

const getCostDetailString = (retailPrice: number): string => {
  const adjustmentString = COST_ADJUSTMENT === 1 ? "" : `* ${COST_ADJUSTMENT}`;
  const discountString = `${COST_DISCOUNT.map(
    (n) => ` - ${toTwoDecimal(n * 100)}%`
  ).reduce((comb, curr) => comb + curr)}`;

  const otherCostString = COST_OTHER === 0 ? "" : `+ ${COST_OTHER}`;

  return `(\$${retailPrice}${adjustmentString}${discountString}${otherCostString})`;
};

const getPayoutDetailString = (sellingPrice: number): string => {
  const adjustmentString =
    PAYOUT_ADJUSTMENT === 1 ? "" : `* ${PAYOUT_ADJUSTMENT}`;
  const rateFeeString = `${GOAT_FEE_RATE.map(
    (n) => ` - ${toTwoDecimal(n * 100)}%`
  ).reduce((comb, curr) => comb + curr)})`;
  const fixedFeeString = GOAT_FEE_FIXED === 0 ? "" : `+ ${GOAT_FEE_FIXED}`;

  return `\$${sellingPrice}${adjustmentString}${rateFeeString}${fixedFeeString}`;
};

const EnhancedTable: FC = () => {
  const [order, setOrder] = useState<Order>("desc");
  const [orderBy, setOrderBy] = useState<keyof GoatCatalogTableData>("profit");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [rows, setRows] = useState<GoatCatalogTableData[]>([]);

  const populateGoatTable = async () => {
    const msgs: DiscordMessage[] = await fetchDiscordMessage(
      ChannelId.US_NIKE_FRONTEND_BACKEND
    );
    const goatData: GoatCatalogTableData[] = [];

    const testSet = new Set<string>();

    for (let i = 0; i < Math.min(MAX_MSG_TO_LOAD, msgs.length); i++) {
      const msg = msgs[i];
      testSet.add(msg.sku);
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
              imageUrl: msg.imageUrl,
              title: goatCatalog.title,
              size: pricing.size,
              cost: retailPrice,
              sellingPrice: pricing.lowestListingPrice,
              profit: toTwoDecimal(
                calculatePayout(pricing.lowestListingPrice) -
                  calculateCost(retailPrice)
              ),
              retailLink: msg.availableSizes[pricing.size].retailLink,
              stock: msg.availableSizes[pricing.size].stock,
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
                      align="right"
                    >
                      {formattedDate}
                    </TableCell>
                    <TableCell align="center">
                      <img
                        src={row.imageUrl.toString()}
                        width={"70px"}
                        height={"70px"}
                      />
                    </TableCell>
                    <TableCell>{row.sku}</TableCell>
                    <TableCell align="left">{row.title}</TableCell>
                    <TableCell align="center">{row.size}</TableCell>
                    <TableCell align="center">
                      <div>
                        <Tooltip
                          title={getCostDetailString(Number(row.cost))}
                          placement="top-start"
                        >
                          <div>
                            {`\$${calculateCost(Number(row.cost))}`}
                            <QuestionMarkIcon sx={{ fontSize: 12 }} />
                          </div>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell align="center">
                      <div>
                        <Tooltip
                          title={getPayoutDetailString(
                            Number(row.sellingPrice)
                          )}
                          placement="top-start"
                        >
                          <div>
                            {`\$${calculatePayout(Number(row.sellingPrice))}`}
                            <QuestionMarkIcon sx={{ fontSize: 12 }} />
                          </div>
                        </Tooltip>
                      </div>
                    </TableCell>
                    <TableCell align="center">{`\$${row.profit}`}</TableCell>
                    <TableCell align="center">{row.stock}</TableCell>
                    <TableCell align="left">
                      <a href={row.retailLink.toString()} target="_blank">
                        {row.retailLink}
                      </a>
                    </TableCell>
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
