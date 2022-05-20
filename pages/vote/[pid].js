import Head from "next/head";
import { useState } from "react";
import Image from "next/image";
import { supabase } from "../../utils/supabaseClient";

const MIN_AGE = 1;
const MAX_AGE = 120;
const PLACEHOLDER_AGE = 30;
const GENDERS = ["F", "M", "NB"];

function updateSelection(votes, maxVotes, newVote) {
  const idx = votes.indexOf(newVote);
  if (idx > -1) {
    return votes.filter((v) => v !== newVote);
  }
  return votes.concat(newVote).slice(0, maxVotes);
}

function arrToOrderedMap(arr) {
  return arr.reduce((xs, x, idx) => {
    xs[x] = idx + 1;
    return xs;
  }, {});
}

function UploadedImage({ url, isPriority, onClick, orderedVotes }) {
  const order = orderedVotes && orderedVotes[url];
  return (
    <div className="py-2" onClick={onClick}>
      <div className="relative w-80 h-80">
        <Image
          src={url}
          priority={isPriority}
          layout="fill"
          objectFit="contain"
        />
        {order && (
          <div className="absolute px-8 py-6 rounded-full text-center bg-sky-500/[0.5] text-2xl">
            {order}
          </div>
        )}
      </div>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { pid } = params;
  const [imagePaths, maxVotes] = await supabase
    .rpc("get_poll_by_id", { pid })
    .then((res) => {
      const { data } = res;
      const { max_choices, images } = data[0];
      const imagePaths = images.map((i) => {
        const { data } = supabase.storage.from("photos").getPublicUrl(i);
        const { publicURL } = data;
        return publicURL;
      });
      return [imagePaths, max_choices];
    });

  return {
    props: { pid, imagePaths, maxVotes },
  };
}

export default function Vote({ pid, imagePaths, maxVotes }) {
  // Vote data
  const [votes, setVotes] = useState([]);
  const [name, setName] = useState("");
  const [gender, setGender] = useState(GENDERS[0]);
  const [age, setAge] = useState("");

  // UI
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const orderedVotes = arrToOrderedMap(votes);
  const canSubmit = name && gender && age && votes.length && !isVoting;
  const canSubmitClass = canSubmit
    ? "outline outline-2"
    : "bg-slate-500/[0.1] text-black/[0.2]";

  const createVote = async () => {
    setIsVoting(true);
    try {
      const newVote = {
        poll_id: pid,
        name,
        age,
        gender,
        choices: votes,
      };
      await supabase.from("votes").insert([newVote]);
      // (TODO) Add confirmation UI after voting
      setHasVoted(true);
    } catch (error) {
      // (TODO) Add real error message
      console.log(error.message);
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div>
      <Head>
        <title>Image Poll</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto max-w-lg p-4 flex flex-col items-center">
        <div className="text-2xl py-4">Image Poll</div>
        <p>Choose up to {maxVotes} pictures </p>
        {imagePaths.map((url, idx) => (
          <UploadedImage
            key={url}
            url={url}
            isPriority={idx < 3 ? true : false}
            orderedVotes={orderedVotes}
            onClick={() => setVotes(updateSelection(votes, maxVotes, url))}
          />
        ))}
        <div className="py-4 flex">
          <div className="text-lg w-48 py-2">Name</div>
          <input
            type="text"
            value={name}
            placeholder="Jane Doe"
            onChange={(e) => setName(e.target.value)}
            className="outline outline-2 w-32 p-2 text-right"
          />
        </div>
        <div className="py-4 flex">
          <div className="text-lg w-16 py-2">Gender</div>
          <span className="w-64 text-right">
            {GENDERS.map((g) => {
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
          </span>
        </div>
        <div className="py-4 flex">
          <div className="text-lg flex-1 w-64 py-2">Age</div>
          <input
            type="number"
            min={MIN_AGE}
            max={MAX_AGE}
            placeholder={PLACEHOLDER_AGE}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="outline outline-2 w-16 p-2 text-right"
          />
        </div>
        <button
          disabled={!canSubmit}
          onClick={createVote}
          className={`mt-4 px-16 py-4 ${canSubmitClass}`}
        >
          {isVoting ? "..." : "Submit"}
        </button>

        {hasVoted && <div className="py-4">Thank you for voting!</div>}
      </div>
    </div>
  );
}