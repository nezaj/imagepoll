import Head from "next/head";
import { useState } from "react";
import Image from "next/image";

import { supabase } from "../../utils/supabaseClient";

function scoreVotes(votes, maxChoices) {
  const scored = votes
    .map((v) => v.choices)
    .reduce((res, choices) => {
      choices.forEach((c, idx) => {
        res[c] = res[c] || 0;
        res[c] += maxChoices - idx;
      });
      return res;
    }, {});
  return Object.entries(scored).sort((a, b) => b[1] - a[1]);
}

function updateSet(expandedSet, id) {
  let copy = new Set([...expandedSet]);
  copy.has(id) ? copy.delete(id) : copy.add(id);
  return copy;
}

function getVoter(votes, id) {
  return votes.find((v) => v.id === id);
}

function withFiltered(votes, gender, minAge, maxAge) {
  return votes
    .filter((v) => gender === "All" || v.gender === gender)
    .filter((v) => v.age >= minAge && v.age <= maxAge);
}

function withIgnored(votes, ignoredVoters) {
  return votes.filter((v) => !ignoredVoters.has(v.id));
}

const genders = ["All", "F", "M", "NB"];

// (TODO) Add error handling
async function fetchPollData(pkey) {
  return supabase.rpc("get_poll_by_key", { pkey }).then((res) => {
    const { data } = res;
    const { max_choices } = data[0];
    return max_choices;
  });
}

// (TODO) Add error handling
async function fetchPollVotes(pkey) {
  return supabase.rpc("get_poll_votes", { pkey }).then((res) => {
    const { data } = res;
    return data || [];
  });
}

export async function getServerSideProps({ params }) {
  const { pkey } = params;
  const [maxChoices, votes] = [
    await fetchPollData(pkey),
    await fetchPollVotes(pkey),
  ];

  return {
    props: { maxChoices, votes },
  };
}

export default function Results({ votes, maxChoices }) {
  // Filters
  const [minAge, setMinAge] = useState(1);
  const [maxAge, setMaxAge] = useState(120);
  const [gender, setGender] = useState(genders[0]);
  const [expandedVoters, setExpandedVoters] = useState(new Set([]));
  const [ignoredVoters, setIgnoredVoters] = useState(new Set([]));

  // Computed
  const filteredVotes = withFiltered(votes, gender, minAge, maxAge);
  const scoredVoters = withIgnored(filteredVotes, ignoredVoters);
  const numVoters = scoredVoters.length;
  const results = scoreVotes(scoredVoters, maxChoices);

  return (
    <div>
      <Head>
        <title>Image Poll</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="overflow-y-auto mx-auto max-w-lg p-4 flex flex-col items-center">
        <div className="text-2xl py-4">Image Poll</div>
      </div>
      <div className="p-4 flex flex-col">
        <div className="text-xl">Results</div>
        <div className="flex py-4">
          <div className="w-32 justify-start py-2">Age</div>
          <div className="w-64 justify-end flex">
            <input
              className="ml-4 p-2 outline outline-2 text-center"
              type="number"
              min="1"
              max="120"
              value={minAge}
              onChange={(e) => setMinAge(e.target.value)}
            />
            <div className="ml-4 py-2 text-lg">to</div>
            <input
              className="ml-4 p-2 outline outline-2 text-center"
              type="number"
              min="1"
              max="120"
              value={maxAge}
              onChange={(e) => setMaxAge(e.target.value)}
            />
          </div>
        </div>
        <div className="flex py-4">
          <div className="w-32 justify-start py-2">Gender</div>
          <div className="w-64 justify-end flex">
            {genders.map((g) => {
              const selectedClass = g === gender ? "bg-sky-500/[0.5]" : "";
              return (
                <button
                  key={g}
                  className={`outline outline-2 ml-4 py-2 px-4 text-center ${selectedClass}`}
                  onClick={() => setGender(g)}
                >
                  {g}
                </button>
              );
            })}
          </div>
        </div>
        <div className="py-4 w-32">Scored Voters: {numVoters}</div>
        <div className="py-4 grid gap-4 grid-cols-3 justify-items-stretch">
          {/* (TODO) Render score somewhere? */}
          {results.map(([url, score]) => (
            <div key={url} className="relative w-28 h-28">
              <Image
                src={url}
                layout="fill"
                objectFit="contain"
                priority={true}
              />
            </div>
          ))}
        </div>
        <div className="text-xl py-4">
          Filtered Reponses ({filteredVotes.length})
        </div>
        <div className="w-full">
          <div className="grid grid-cols-3 pb-2 my-4 border-b-2 border-black">
            <div className="text-lg">Name</div>
            <div className="text-lg text-center">Age</div>
            <div className="text-lg text-center">Gender</div>
          </div>
          {filteredVotes.map((v) => {
            const ignoredClass = ignoredVoters.has(v.id) ? "opacity-30" : "";
            return (
              <div
                key={v.id}
                className={`pb-2 my-4 border-b-2 ${ignoredClass}`}
              >
                <div
                  className="grid grid-cols-3"
                  onClick={() =>
                    setExpandedVoters(updateSet(expandedVoters, v.id))
                  }
                >
                  <div className="text-lg">{v.name}</div>
                  <div className="text-lg text-center">{v.age}</div>
                  <div className="text-lg text-center">{v.gender}</div>
                </div>
                {expandedVoters.has(v.id) && (
                  <div>
                    <div className="py-2 grid gap-2 grid-cols-3 justify-items-stretch">
                      {getVoter(filteredVotes, v.id).choices.map((url) => (
                        <div key={url} className="relative w-28 h-28">
                          <Image src={url} layout="fill" objectFit="contain" />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-center my-4">
                      <button
                        onClick={() =>
                          setIgnoredVoters(updateSet(ignoredVoters, v.id))
                        }
                        className={`px-8 py-2 outline`}
                      >
                        {ignoredVoters.has(v.id) ? "Include" : "Ignore"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}