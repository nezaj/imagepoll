  export const IMAGE_POLL_BASE =
    process.env.NEXT_PUBLIC_ENV === "dev" ? "localhost:3000" : "https://www.imagepoll.com";

export const LOCAL_RESULTS_KEY = 'imagepoll__results';
export const LOCAL_VOTES_KEY = "imagepoll__votes";

export const RESULT_GENDERS = ["All", "F", "M", "NB"];
export const initialResults = {
  minAge: 1,
  maxAge: 120,
  gender: RESULT_GENDERS[0],
  expandedVotersArr: [],
  ignoredVotersArr: []
}
