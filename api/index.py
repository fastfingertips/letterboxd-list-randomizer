from flask import Flask, request, jsonify, send_from_directory
import random, re, os
from letterboxdpy.list import List as LBList
from letterboxdpy.core.scraper import parse_url
from letterboxdpy.utils.utils_url import get_page_url
from letterboxdpy.utils.movies_extractor import extract_movies_from_vertical_list
import math

# Absolute path to the folder containing index.html (the project root)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Initialize Flask with the project root as the static folder
app = Flask(__name__, static_folder=ROOT_DIR, static_url_path='')

def extract_info(val):
    val = val.strip().lower()
    # Clean up standard URL prefixes
    val = re.sub(r'^https?://(www\.)?letterboxd\.com/', '', val)
    val = re.sub(r'^letterboxd\.com/', '', val)
    
    parts = [p for p in val.split('/') if p]
    
    # Format: user/list/slug
    if len(parts) >= 3 and parts[1] == 'list':
        return parts[0], parts[2]
    # Format: user/slug or user//slug
    elif len(parts) >= 2:
        # ignore generic pages like 'films' or 'followers' to avoid bugs if a user inputs something incomplete
        if parts[1] not in ('films', 'following', 'followers', 'reviews', 'lists', 'watchlist'):
            return parts[0], parts[1]
            
    return None, None

def get_error_msg(e):
    msg = str(e)
    try:
        import json
        return json.loads(msg.split('\n')[0]).get('message', msg)
    except:
        return msg

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api', methods=['POST'])
def randomize():
    try:
        urls = [u.strip() for u in (request.json or {}).get('urls', []) if u.strip()]
        if not urls: return jsonify({"error": "No URLs provided"}), 400
            
        url = random.choice(urls)
        user, slug = extract_info(url)
        if not user: return jsonify({"error": f"Invalid URL: {url}"}), 400
            
        lb = LBList(user, slug)
        count = lb.get_count()
        if not count: return jsonify({"error": "List is empty"}), 404
            
        # Optimization: Pick a random page (100 items per page)
        total_pages = math.ceil(count / 100)
        page_dom = parse_url(get_page_url(lb.url, random.randint(1, total_pages)))
        movies = extract_movies_from_vertical_list(page_dom)
        
        if not movies:
            return jsonify({"error": "Failed to extract movies"}), 500
            
        movie = random.choice(list(movies.values()))
        return jsonify({
            "movie": {k: movie.get(k) for k in ['name', 'url', 'year']},
            "list": {"title": lb.title, "count": count, "url": url}
        })
    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500

if __name__ == "__main__":
    print(f"🚀 Starting server from: {ROOT_DIR}")
    # Using port 5050 to avoid any potential port 5000 conflicts
    app.run(port=5050, debug=True)
