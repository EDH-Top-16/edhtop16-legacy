import { useEffect, useMemo, useState } from "react";
import moment from "moment";
import { HiSwitchHorizontal } from "react-icons/hi";
import axios from "axios";

import Banner from "../Banner/Banner";
import Entry from "../Entry";
import {
  getCommanders,
  getCommanderRankings,
  sortEntries,
} from "../../data/Commanders";
import { createSearchParams, useNavigate } from "react-router-dom";
import { compressObject, insertIntoObject } from "../../utils";
import { RxCaretSort, RxChevronDown } from "react-icons/rx";
import SingleTournamentView from "../TournamentView/SingleTournamentView";
import _ from "lodash";

const TERMS = [
  {
    name: "Standing",
    tag: "standing",
    cond: [
      {
        $lte: `Top X:`,
        component: "select",
        type: "number",
        values: [
          {
            value: null,
            name: "Filter By Top X",
            disabled: true,
            selected: true,
          },
          {
            value: 1,
            name: "Top 1",
          },
          {
            value: 4,
            name: "Top 4",
          },
          {
            value: 16,
            name: "Top 16",
          },
          {
            value: 32,
            name: "Top 32",
          },
          {
            value: 64,
            name: "Top 64",
          },
        ],
      },
      // { $eq: `is equal to (=)`, type: "number" },
      // { $lte: `is less than (\u2264)`, type: "number" },
    ],
  },
  {
    name: "Entries",
    tag: "entries",
    cond: [
      { $gte: `is greater than (\u2265)`, type: "number" },
      { $eq: `is equal to (=)`, type: "number" },
      { $lte: `is less than (\u2264)`, type: "number" },
    ],
  },
  {
    name: "Tournament Size",
    tag: "size",
    isTourneyFilter: true,
    cond: [
      { $gte: `is greater than (\u2265)`, type: "number" },
      { $eq: `is equal to (=)`, type: "number" },
      { $lte: `is less than (\u2264)`, type: "number" },
    ],
  },
  {
    name: "Tournament Date",
    tag: "dateCreated",
    isTourneyFilter: true,
    cond: [
      { $gte: `is after (\u2265)`, type: "date" },
      { $eq: `is (=)`, type: "date" },
      { $lte: `is before (\u2264)`, type: "date" },
    ],
  },
];

const TERMS_NO_TOURNEY_FILTER = [
  {
    name: "Standing",
    tag: "standing",
    cond: [
      {
        $lte: `Top X:`,
        component: "select",
        type: "number",
        values: [
          {
            value: null,
            name: "Filter By Top X",
            disabled: true,
            selected: true,
          },
          {
            value: 1,
            name: "Top 1",
          },
          {
            value: 4,
            name: "Top 4",
          },
          {
            value: 16,
            name: "Top 16",
          },
          {
            value: 32,
            name: "Top 32",
          },
          {
            value: 64,
            name: "Top 64",
          },
        ],
      },
      // { $eq: `is equal to (=)`, type: "number" },
      // { $lte: `is less than (\u2264)`, type: "number" },
    ],
  },
  {
    name: "Entries",
    tag: "entries",
    cond: [
      { $gte: `is greater than (\u2265)`, type: "number" },
      { $eq: `is equal to (=)`, type: "number" },
      { $lte: `is less than (\u2264)`, type: "number" },
    ],
  },
];

/**
 * @TODO create sorting for each heading
 */

export default function CommanderView({setCommanderExist}, _filters) {
  const defaultFilters =
    Object.values(_filters).length > 0
      ? _filters
      : {
          tourney_filter: {
            size: { $gte: 64 },
            dateCreated: { $gte: moment().subtract(1, "year").unix() },
          },
        };

  const loadFilters = useMemo(() => {
    const params = new URLSearchParams(window.location.search);

    let generated_filters = {};
    params.forEach((val, key) => {
      generated_filters = insertIntoObject(
        generated_filters,
        key.split("__"),
        val
      );
    });

    return Object.entries(generated_filters).length > 0
      ? generated_filters
      : defaultFilters;
  }, []);

  const navigate = useNavigate();

  const [commanders, setCommanders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topX, setTopX] = useState(16);
  const [filters, setFilters] = useState(loadFilters);
  const [allFilters, setAllFilters] = useState(loadFilters);
  const [colors, setColors] = useState((loadFilters.colorID ?? "").split(""));
  const [sort, setSort] = useState("topX");
  const [toggled, setToggled] = useState(false);
  const [tournamentName, setTournamentName] = useState("");
  const [metabreakdown, setMetabreakdown] = useState(true);

  /**
   * @TODO Build filterString from colors and filters
   */
  useEffect(() => {
    // console.log("filterscolorschanged", filters, colors);
    let newFilters = { ...filters, colorID: null };
    if (!!colors && colors.join("") !== "") {
      newFilters = {
        ...filters,
        colorID: colors.join(""),
      };
    }

    if (!_.isEqual(newFilters, allFilters)) {
      setAllFilters(newFilters);

      navigate(
        {
          search: `${createSearchParams(compressObject(newFilters))}`,
        },
        { replace: true }
      );
    }
  }, [colors, filters]);

  useEffect(() => {
    // console.log("filterschanged");
    if (!!filters.tourney_filter && "TID" in filters.tourney_filter) {
      axios
        .post(
          process.env.REACT_APP_uri + "/api/list_tourneys",
          filters.tourney_filter
        )
        .then((res) => {
          if ("tournamentName" in res.data[0]) {
            setTournamentName(res.data[0].tournamentName);
          }
        });
    } else {
      setTournamentName("");
    }
  }, [allFilters]);

  /**
   * Main getCommanders() API call
   * TODO: split this up to only send a request if allFilters is changed (rest should just be handles client-side)
   */
  useEffect(() => {
    let { entries } = allFilters;
    // console.log("allfilters", allFilters);

    getCommanders({
      ...allFilters,
      colorID: allFilters.colorID ?? undefined,
    }).then((data) => {
      // console.log("Data:", data);
      const commanderRankings = getCommanderRankings(data, entries, topX);
      // console.log("Commander Rankings:", commanderRankings);
      const sortedCommanders = sortEntries(commanderRankings, sort, toggled);
      setCommanders(sortedCommanders);
      setIsLoading(false);
    });
  }, [allFilters]);

  useEffect(() => {
    // console.log("sorttoggledtopx", sort, toggled, topX);
    let { entries } = allFilters;
    const commanderRankings = getCommanderRankings(commanders, entries, topX);
    // console.log("Commander Rankings:", commanderRankings);
    const sortedCommanders = sortEntries(commanderRankings, sort, toggled);
    setCommanders(sortedCommanders);
    setIsLoading(false);
  }, [sort, toggled, topX]);

  /**
   * These two functions get data from colorSelection and filters child components
   */
  function getColors(data) {
    setColors(data);
  }
  function getFilters(data) {
    setFilters(data);
  }
  function toggleMetabreakdown(){
    setMetabreakdown(!metabreakdown);
  }

  /**
   * Changes the sort order
   */
  function handleSort(x) {
    setSort(x);
    if (x === sort) {
      setToggled(!toggled);
    }
  }

  /**
   * Changes the topX filter
   * @TODO Probably should move to backend (?)
   */
  function changeTopX() {
    setTopX(topX === 16 ? 4 : topX === 4 ? 1 : 16);
  }

  return (metabreakdown ? (
    <div className="flex flex-col flex-grow overflow-auto">
      {/* Banner */}
      <Banner
        title={
          !tournamentName ? "View Decks" : "Meta Breakdown - " + tournamentName
        }
        enableSearchbar={true}
        enableColors={true}
        enableFilters={true}
        defaultFilters={defaultFilters}
        defaultColors={colors}
        getFilters={getFilters}
        allFilters={allFilters}
        terms={!tournamentName ? TERMS : TERMS_NO_TOURNEY_FILTER}
        getColors={getColors}
        enableMetaBreakdownButton={!!tournamentName}
        metabreakdownMessage="Back to Tournament"
        toggleMetabreakdown={toggleMetabreakdown}
      />

      {/* Table of commanders */}
      <table className="mx-2 md:mx-6 my-2 border-spacing-y-3 border-separate">
        <thead className="hidden md:table-row-group [&>tr>td>p]:cursor-pointer [&>tr>td]:px-4">
          <tr className="text-subtext dark:text-white text-lg ">
            <td>
              <p className="cursor-normal font-bold">#</p>
            </td>
            <td>
              <p
                onClick={() => handleSort("commander")}
                className="flex flex-row items-center gap-1 font-bold"
              >
                Name
                {sort === "commander" ? (
                  <RxChevronDown
                    className={`${
                      toggled ? "" : "rotate-180"
                    } transition-all duration-200k`}
                  />
                ) : (
                  <RxCaretSort
                    className={`text-lightText dark:text-text transition-all duration-200k`}
                  />
                )}
              </p>
            </td>
            <td className="space-x-2">
              <HiSwitchHorizontal
                onClick={() => changeTopX()}
                className="cursor-pointer inline-block text-lg md:text-sm"
              />
              <p
                onClick={() => handleSort("topX")}
                className="inline-flex flex-row items-center gap-1 font-bold"
              >
                Top {topX}s
                {sort === "topX" ? (
                  <RxChevronDown
                    className={`${
                      toggled ? "" : "rotate-180"
                    } transition-all duration-200k`}
                  />
                ) : (
                  <RxCaretSort
                    className={`text-lightText dark:text-text transition-all duration-200k`}
                  />
                )}
              </p>
            </td>
            <td>
              <p
                onClick={() => handleSort("count")}
                className="flex flex-row items-center gap-1 font-bold"
              >
                Entries
                {sort === "count" ? (
                  <RxChevronDown
                    className={`${
                      toggled ? "" : "rotate-180"
                    } transition-all duration-200k`}
                  />
                ) : (
                  <RxCaretSort
                    className={`text-lightText dark:text-text transition-all duration-200k`}
                  />
                )}
              </p>
            </td>
            <td>
              <p
                onClick={() => handleSort("conversion")}
                className="flex flex-row items-center gap-1 font-bold"
              >
                Conversion
                {sort === "conversion" ? (
                  <RxChevronDown
                    className={`${
                      toggled ? "" : "rotate-180"
                    } transition-all duration-200k`}
                  />
                ) : (
                  <RxCaretSort
                    className={`text-lightText dark:text-text transition-all duration-200k`}
                  />
                )}
              </p>
            </td>
            <td>
              <p className="font-bold">Colors</p>
            </td>
          </tr>
        </thead>
        <tbody className="[&>tr>td>p]:cursor-pointer [&>tr>td]:px-4 md:[&>tr>td]:px-4 [&>tr]:my-3 ">
          {isLoading ? (
            <tr className="text-lightText dark:text-text text-lg">
              Loading...
            </tr>
          ) : commanders && commanders.length === 0 ? (
            <div className="w-full flex justify-center items-center text-accent dark:text-text font-bold text-2xl">
              No data available
            </div>
          ) : (
            commanders.map((v, i) => (
              <Entry
                enableLink={true}
                slug={"/commander/" + v.slug}
                rank={i + 1}
                name={v.commander}
                metadata={[
                  v.topX,
                  v.count,
                  ((v.topX / v.count) * 100).toFixed(2) + "%",
                ]}
                metadata_fields={["Top X", "Entries", "Conversion:"]}
                colors={v.colorID}
                filters={allFilters}
              />
            ))
          )}
        </tbody>
      </table>
    </div>) : (<SingleTournamentView setCommanderExist={setCommanderExist}/>)
  );
}
