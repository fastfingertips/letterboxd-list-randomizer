import math
import random

from letterboxdpy.constants.project import DOMAIN
from letterboxdpy.core.scraper import parse_url
from letterboxdpy.list import List as LBList
from letterboxdpy.pages.movie_profile import MovieProfile
from letterboxdpy.utils.movies_extractor import extract_movies_from_vertical_list
from letterboxdpy.utils.utils_url import get_page_url

from constants import MOVIES_PER_PAGE
from utils import progress_step


@progress_step("Fetching List Metadata")
def get_list_metadata(user, slug):
    """Returns (lb_instance, title, count)"""
    lb = LBList(user, slug)
    return lb, lb.title, lb.get_count()


@progress_step("Selecting Random Movie from List")
def get_random_movie_meta(user, slug, count):
    """Fetches a random page from list and picks a movie slug"""
    list_url = f"{DOMAIN}/{user}/list/{slug}"

    total_pages = math.ceil(count / MOVIES_PER_PAGE)
    random_page = random.randint(1, total_pages)
    page_dom = parse_url(get_page_url(list_url, random_page))

    movies_meta = extract_movies_from_vertical_list(page_dom)
    if not movies_meta:
        return None

    candidate_id = random.choice(list(movies_meta.keys()))
    return movies_meta[candidate_id]  # {slug, name, year, url}


@progress_step("Fetching Film Details (Poster & Rating)")
def get_movie_details(slug):
    """Uses MovieProfile to get high-speed rich data"""
    profile = MovieProfile(slug)
    return {
        "name": profile.get_title(),
        "year": profile.get_year(),
        "slug": profile.slug,
        "url": profile.url,
        "poster": profile.get_poster(),
        "rating": profile.get_rating(),
    }


def get_random_from_instance(lb, count):
    """Orchestrates the granular selection steps (internal helper)"""
    meta = get_random_movie_meta(lb.username, lb.slug, count)
    if not meta:
        return None

    return get_movie_details(meta["slug"])
