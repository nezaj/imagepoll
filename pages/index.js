import Head from "next/head";
import Link from "next/link";
import { useRouter } from 'next/router'
import ImageUploading from "react-images-uploading";
import Toggle from "react-toggle";
import { useState } from "react";
import imageCompression from "browser-image-compression";
import { CopyToClipboard } from "react-copy-to-clipboard";

import { supabase } from "../utils/supabaseClient";
import { IMAGE_POLL_BASE, LOCAL_VOTES_KEY, LOCAL_RESULTS_KEY, initialResults } from "../utils/config";
import { useLocalStorageAt } from "../utils/hooks"
import { StyledToastContainer, successToast } from "../utils/toast";


import "react-toggle/style.css";

function now() {
  return new Date().getTime();
}

export default function Home() {
  const { router } = useRouter();

  // (TODO) This is ugly, I'm conflating vote/results state with displaying
  // created polls and voted polls. A clean abstraction would be nicer.
  const [results, setResults] = useLocalStorageAt([LOCAL_RESULTS_KEY], {});
  const [votes, _setVotes] = useLocalStorageAt([LOCAL_VOTES_KEY], {});
  const createdPollKeys = Object.keys(results).filter(key => results[key].created);
  const createdPollIds = new Set(createdPollKeys.map(key => results[key].pid))
  const otherPollIds = Object.keys(votes).filter(id => !createdPollIds.has(id))

  const [images, setImages] = useState([]);
  const [numChoices, setNumChoices] = useState(null);
  const [areResultsShared, setAreResultsShared] = useState(false);

  const [isPollCreating, setIsPollCreating] = useState(false);
  const [isPollCreated, setIsPollCreated] = useState(false);
  const [pollData, setPollData] = useState(null);
  const maxUpload = 12;

  const buildPath = (file) => {
    const fileExt = file.name.split(".").pop();
    return `${now()}-${Math.random()}.${fileExt}`;
  };

  const uploadImage = async (file, filePath) => {
    const options = {
      maxSizeMB: 0.25,
      useWebWorker: true,
    };
    const compressed = await imageCompression(file, options);
    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(filePath, compressed);

    if (uploadError) {
      throw uploadError;
    }

    return filePath;
  };

  const createPoll = async () => {
    setIsPollCreating(true);
    try {
      const paths = images.map((i) => buildPath(i.file));
      // (TODO): Currently this is a fire and forget, but we
      // may want to wait on the images actually being upload
      // before returning
      images.forEach((i, idx) => uploadImage(i.file, paths[idx]));
      const newPoll = {
        images: paths,
        share_results: areResultsShared,
        max_choices: numChoices,
      };
      const { data } = await supabase.from("polls").insert([newPoll]);
      setPollData({
        poll_id: data[0].id,
        poll_key: data[0].poll_key,
      });
      setResults([LOCAL_RESULTS_KEY, data[0].poll_key], {...initialResults, pid: data[0].id, created: true})
      successToast("Your poll has been created!");
      setIsPollCreated(true);
    } catch (error) {
      // (TODO) Add real error message
      console.log(error.message);
    } finally {
      setIsPollCreating(false);
    }
  };

  const onChange = (imageList, _) => {
    setImages(imageList);
    !numChoices && imageList.length && setNumChoices(imageList.length);
  };

  return (
    <div>
      <Head>
        <title>Image Poll</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="mx-auto max-w-lg px-4 flex flex-col items-center">
        {!isPollCreated && (
          <div>
            <div className="text-2xl pt-8 pb-4 text-center">
            <Link href="/">
              <a>Image Poll</a>
            </Link>
            </div>
            <div className="text-lg text-center">
              Image Poll enables you to ask your community to rank your photos.
              Use this to figure what is best for your dating profile,
              portfolio, etc.
            </div>
            <ImageUploading
              multiple
              value={images}
              onChange={onChange}
              maxNumber={maxUpload}
              dataURLKey="data_url"
            >
              {({
                imageList,
                onImageUpload,
                onImageUpdate,
                onImageRemove,
                dragProps,
              }) => (
                <div className="py-4 text-center">
                  <button
                    className="px-16 py-4 border-solid border-2"
                    onClick={onImageUpload}
                    {...dragProps}
                  >
                    Upload photos
                  </button>
                  {!imageList.length && (
                  <div>
                    {createdPollKeys.length > 0 && (
                      <div className="flex flex-col">
                        <div className="pt-4 pb-2">Your polls</div>
                        {createdPollKeys.map(pkey =>
                          <div className="flex pb-2 mx-auto" key={pkey}>
                            <div className="flex w-32">
                              Vote:
                              <Link href={`/vote/${results[pkey].pid}`}>
                                <a className="pl-2 text-sky-500">{results[pkey].pid}</a>
                              </Link>
                            </div>

                            <div className="flex w-32">
                              Results:
                              <Link href={`/results/${pkey}`}>
                                <a className="pl-2 text-sky-500">{pkey}</a>
                              </Link>
                            </div>
                          </div>)}
                      </div>)}
                    {otherPollIds.length > 0 && (
                      <div className="flex flex-col">
                        <div className="py-2">Other polls</div>
                            {otherPollIds.map(pid =>
                            <div key={pid} className="flex py-2 mx-auto">
                              Vote:
                              <Link href={`/vote/${pid}`}>
                                <a className="pl-2 text-sky-500">{pid}</a>
                              </Link>
                            </div>
                          )}
                      </div>)}
                  </div>)}
                  <div className="pt-4 grid gap-4 grid-cols-3">
                    {imageList.map((image, index) => (
                      <div key={image["data_url"]} className="image-item">
                        {/* (TODO) Use Next's Image component */}
                        <img src={image["data_url"]} alt="" width="100" />
                        <div className="image-item__btn-wrapper">
                          <button onClick={() => onImageUpdate(index)}>
                            Update
                          </button>
                          <button onClick={() => onImageRemove(index)}>
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ImageUploading>
          </div>
        )}
        {!isPollCreated && images.length > 1 && (
          <div className="text-center py-4">
            <div className="text-2xl py-4">Max Choices</div>
            <div className="flex justify-center">
              <button
                className="text-2xl px-4"
                disabled={numChoices < 3}
                onClick={() => setNumChoices(numChoices - 1)}
              >
                -
              </button>
              <div className="text-xl border-solid border-2 rounded-full px-4 py-2">
                {numChoices}
              </div>
              <button
                className="text-2xl px-4"
                disabled={numChoices > images.length - 1}
                onClick={() => setNumChoices(numChoices + 1)}
              >
                +
              </button>
            </div>
            <div className="flex justify-center py-4">
              <div className="px-2">Share results?</div>
              <label>
                <Toggle
                  defaultChecked={areResultsShared}
                  icons={false}
                  onChange={() => setAreResultsShared(!areResultsShared)}
                />
              </label>
            </div>
            <button
              className="px-16 py-4 border-solid border-2"
              disabled={isPollCreating}
              onClick={createPoll}
            >
              {isPollCreating ? "..." : "Create Poll"}
            </button>
          </div>
        )}
        {isPollCreated && (
          <div className="flex flex-col h-screen justify-center text-center">
            <span className="text-lg py-4">
              Huzzah! Your poll has been created!
            </span>
            <span className="text-sm pb-4">Send this link for voting</span>
            <CopyToClipboard
              text={`${IMAGE_POLL_BASE}/vote/${pollData.poll_id}`}
            >
              <input
                type="text"
                className="px-4 py-4 border-solid border-2 my-2 truncate max-w-xs cursor-pointer"
                value={`${IMAGE_POLL_BASE}/vote/${pollData.poll_id}`}
                readOnly
                onClick={(e) => {
                  successToast("Vote link copied!");
                }}
              ></input>
            </CopyToClipboard>
            <span className="text-sm py-4">Use this link to see results</span>
            <CopyToClipboard
              text={`${IMAGE_POLL_BASE}/results/${pollData.poll_key}`}
            >
              <input
                className="px-4 py-4 border-solid border-2 my-2 truncate max-w-xs cursor-pointer"
                value={`${IMAGE_POLL_BASE}/results/${pollData.poll_key}`}
                readOnly
                onClick={(e) => {
                  successToast("Results link copied!", 5000);
                }}
              ></input>
            </CopyToClipboard>
            <div className="text-sm py-4">
              Or <a href="/" className="text-sky-500 cursor-pointer">create a new poll</a>
            </div>
          </div>
        )}
      </div>
      <StyledToastContainer />
    </div>
  );
}
