import Head from "next/head";
import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { supabase } from "../../utils/supabaseClient";
import { IMAGE_POLL_BASE, LOCAL_VOTES_KEY } from "../../utils/config";
import { StyledToastContainer, successToast } from "../../utils/toast";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { useLocalStorageAt } from "../../utils/hooks"

const MIN_AGE = 1;
const MAX_AGE = 120;
const PLACEHOLDER_AGE = 30;
const GENDERS = ["F", "M", "NB"];

function updateSelection(choices, maxChoices, newVote) {
  const idx = choices.indexOf(newVote);
  if (idx > -1) {
    return choices.filter((v) => v !== newVote);
  }
  return choices.concat(newVote).slice(0, maxChoices);
}

function arrToOrderedMap(arr) {
  return arr.reduce((xs, x, idx) => {
    xs[x] = idx + 1;
    return xs;
  }, {});
}

function UploadedImage({ url, isPriority, onClick, orderedChoices }) {
  const order = orderedChoices && orderedChoices[url];
  return (
    <div className="py-2 cursor-pointer" onClick={onClick}>
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
  const [imagePaths, maxChoices, pollKey, error] = await supabase
    .rpc("get_poll_by_id", { pid })
    .then((res) => {
      const { data } = res;
      if (!data) { throw 'Not found' }
      const { max_choices, images, poll_key } = data[0];
      const imagePaths = images.map((i) => {
        const { data } = supabase.storage.from("photos").getPublicUrl(i);
        const { publicURL } = data;
        return publicURL;
      });
      return [imagePaths, max_choices, poll_key, null];
    }).catch((error) => [null, null, null, error]);

  if (error) {
    return {
      notFound: true
    }
  }

  return {
    props: { pid, imagePaths, maxChoices, pollKey },
  };
}

const initialVote = {
  id: null,
  choices: [],
  name: "",
  gender: GENDERS[0],
  age: ""
}

export default function Vote({ pid, imagePaths, maxChoices, pollKey}) {
  const [voteData, setVoteData] = useLocalStorageAt([LOCAL_VOTES_KEY, pid], initialVote);
  const { id, choices, name, gender, age } = voteData || initialVote;
  const [setId, setChoices, setName, setGender, setAge ] = ["id", "choices", "name", "gender", "age"].map(key => (newVal) => setVoteData([LOCAL_VOTES_KEY, pid, key], newVal));

  // UI
  const [isVoting, setIsVoting] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const orderedChoices = arrToOrderedMap(choices);
  const canSubmit = name && gender && age && choices.length && !isVoting;
  const canSubmitClass = canSubmit
    ? "outline outline-2"
    : "bg-slate-500/[0.1] text-black/[0.2]";

  const createVote = async () => {
    setIsVoting(true);
    try {
      if (!id) {
        // Create new vote
        const newVote = {
          poll_id: pid,
          name,
          age,
          gender,
          choices,
        };
        const { data } = await supabase.from("votes").insert([newVote])
        setId(data[0].id);
        successToast("Vote submitted!", 5000)
      } else {
        // edit existing voting
        const updatedVote = {
          id,
          poll_id: pid,
          name,
          age,
          gender,
          choices,
        }
        await supabase.from("votes").upsert(updatedVote)
        successToast("Vote updated!", 5000)
      }
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

      {!hasVoted && (
      <div className="mx-auto max-w-lg p-4 flex flex-col items-center">
        <Link href="/">
          <a className="text-2xl py-4 text-center">Image Poll</a>
        </Link>
        <div className="text-md py-2">Choose up to {maxChoices} pictures</div>
        <div className="text-center text-xs pb-4">
          (1 being your top choice, {maxChoices} being your last choice)
        </div>
        {imagePaths.map((url, idx) => (
          <UploadedImage
            key={url}
            url={url}
            isPriority={idx < 3 ? true : false}
            orderedChoices={orderedChoices}
            onClick={() => setChoices(updateSelection(choices, maxChoices, url))}
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
        {choices.length > 0 && (
          <div className="text-center">
            <p>Your choices</p>
            <div className="py-4 grid gap-4 grid-cols-3 ">
              {choices.map((url, idx) => (
                <div key={url}>
                  <div className="absolute px-2 py-1 rounded-full text-center bg-sky-500/[0.5] text-xs z-10">
                    {idx + 1}
                  </div>
                  <div className="relative w-28 h-28">
                    <Image src={url} layout="fill" objectFit="contain" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <button
          disabled={!canSubmit}
          onClick={createVote}
          className={`mt-4 px-16 py-4 ${canSubmitClass}`}
        >
          {isVoting ? "..." : id ? "Update" : "Submit"}
        </button>
      </div>
      )}
    {hasVoted && (
      <div className="flex flex-col h-screen justify-center text-center">
        <span className="text-2xl">Thank you for voting!</span>
        <div className="text-center">
          <p div className="py-4">Your submission</p>
          <div className="flex flex-col mx-4 text-left text-xs">
            <p>Name: {name}</p>
            <p>Gender: {gender}</p>
            <p>Age: {age}</p>
          </div>
          <div className="p-4 grid gap-4 grid-cols-3">
            {choices.map((url, idx) => (
              <div key={url}>
                <div className="absolute px-2 py-1 rounded-full text-center bg-sky-500/[0.5] z-10 text-xs">
                  {idx + 1}
                </div>
                <div className="relative w-32 h-32">
                  <Image src={url} layout="fill" objectFit="contain" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {pollKey && (
          <div>
          <div className="py-4">You can see the results for this poll at this link</div>
          <CopyToClipboard
            text={`${IMAGE_POLL_BASE}/results/${pollKey}`}
          >
            <input
              className="px-4 py-4 border-solid border-2 my-2 truncate cursor-pointer text-center text-sm w-80"
              value={`${IMAGE_POLL_BASE}/results/${pollKey}`}
              readOnly
              onClick={(e) => {
                successToast("Results link copied!", 5000);
              }}
            ></input>
          </CopyToClipboard>
        </div>
        )}
            <div className="py-2 text-sm"><a href={`/vote/${pid}`} className="text-sky-500 cursor-pointer">Update your submission</a></div>
            <div className="py-2 text-sm"><a href="/" className="text-sky-500 cursor-pointer">Create your own poll</a></div>

      </div>)}
      <StyledToastContainer />
    </div>
  );
}
