import random, math
from letterboxdpy.list import List as LBList
from letterboxdpy.pages.movie_profile import MovieProfile
from letterboxdpy.core.scraper import parse_url
from letterboxdpy.utils.utils_url import get_page_url
from letterboxdpy.utils.movies_extractor import extract_movies_from_vertical_list

try:
    from .utils import progress_step
except ImportError:
    from utils import progress_step


@progress_step("Fetching List Metadata")
def get_list_metadata(user, slug):
    """Returns (lb_instance, title, count) using total library structure"""
    lb = LBList(user, slug)
    return lb, lb.title, lb.get_count()

@progress_step("Scraping Random Page & Movie")
def get_random_from_instance(lb, count):

    """
    Picks a random movie from an existing LBList instance.
    Uses library's Movie object for rich data.
    """
    if not count:
        return None
            
    # 1. Get random page content
    total_pages = math.ceil(count / 100)
    random_page = random.randint(1, total_pages)
    page_dom = parse_url(get_page_url(lb.url, random_page))
    
    # 2. Use library's built-in extractor to get the slugs
    movies_meta = extract_movies_from_vertical_list(page_dom)
    if not movies_meta:
        return None
            
    # 3. Pick a random candidate from the page
    candidate_id = random.choice(list(movies_meta.keys()))
    candidate_meta = movies_meta[candidate_id] # Contains {slug, name, year, url}
    
    # 4. Use library's MovieProfile for high-speed rich data
    # This avoids fetching 5 extra pages (details, reviews, etc.)
    profile = MovieProfile(candidate_meta['slug'])
    
    return {
        "name": profile.get_title(),
        "year": profile.get_year(),
        "slug": profile.slug,
        "url": profile.url,
        "poster": profile.get_poster(),
        "rating": profile.get_rating()
    }

