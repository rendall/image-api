export enum QueryParameters {
    page = "page",
    per_page = "per_page",
    size = "size",
    fields = "fields"
}

export type ImageUrlParameters = {
    w: number,
    h: number, // for adjusting the width and height of a photo
    crop: "top" | "bottom" | "left" | "right" | "faces" | "focalpoint" | "edges" | "entropy",  // for applying cropping to the photo info: https://docs.imgix.com/apis/rendering/size/crop
    fm: "gif" | "jp2" | "jpg" | "json" | "jxr" | "pjpg" | "mp4" | "png" | "png8" | "png32" | "webm" | "webp",
    auto: "format", // for automatically choosing the optimal image format depending on user browser
    q:number, // for changing the compression quality when using lossy file formats value 1-100
    fit: "clamp" | "clip" | "crop" | "facearea" | "fill" | "fillmax" | "max" | "min" | "scale", // for changing the fit of the image within the specified dimensions
    dpr: 1 | 2 | 3 | 4 | 5 // for adjusting the device pixel ratio of the image
}

export type UnsplashSuccessField = "id" | "created_at" | "updated_at" | "promoted_at" | "width" | "height" | "color" | "blur_hash" | "description" | "alt_description" | "urls" | "links" | "categories" | "likes" | "liked_by_user" | "current_user_collections" | "sponsorship" | "user" | "tags"  


export interface UnsplashError {
    errors: string[];
}

export interface UnsplashSuccess {
    total: number;
    total_pages: number;
    results: UnsplashResult[];
    remaining: number;
}

export interface UnsplashResult {
    id: string;
    created_at: Date;
    updated_at: Date;
    promoted_at: null;
    width: number;
    height: number;
    color: string;
    blur_hash: string;
    description: null;
    alt_description: string;
    urls: Urls;
    links: ResultLinks;
    categories: any[];
    likes: number;
    liked_by_user: boolean;
    current_user_collections: any[];
    sponsorship: null;
    user: User;
    tags: UnsplashTag[];
}

export interface ResultLinks {
    self: string;
    html: string;
    download: string;
    download_location: string;
}

export interface UnsplashTag {
    type: string;
    title: string;
    source?: Source;
}

export interface Source {
    ancestry: Ancestry;
    title: string;
    subtitle: string;
    description: string;
    meta_title: string;
    meta_description: string;
    cover_photo: CoverPhoto;
}

export interface Ancestry {
    type: Category;
    category: Category;
    subcategory?: Category;
}

export interface Category {
    slug: string;
    pretty_slug: string;
}

export interface CoverPhoto {
    id: string;
    created_at: Date;
    updated_at: Date;
    promoted_at: Date;
    width: number;
    height: number;
    color: string;
    blur_hash: string;
    description: string;
    alt_description: string;
    urls: Urls;
    links: ResultLinks;
    categories: any[];
    likes: number;
    liked_by_user: boolean;
    current_user_collections: any[];
    sponsorship: null;
    user: User;
}

export interface Urls {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
}

export interface User {
    id: string;
    updated_at: Date;
    username: string;
    name: string;
    first_name: string;
    last_name: string;
    twitter_username: null | string;
    portfolio_url: string;
    bio: string;
    location: string;
    links: UserLinks;
    profile_image: ProfileImage;
    instagram_username: string;
    total_collections: number;
    total_likes: number;
    total_photos: number;
    accepted_tos: boolean;
}

export interface UserLinks {
    self: string;
    html: string;
    photos: string;
    likes: string;
    portfolio: string;
    following: string;
    followers: string;
}

export interface ProfileImage {
    small: string;
    medium: string;
    large: string;
}
