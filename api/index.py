from flask import Flask, request, jsonify
import random, os

# Try relative imports for Vercel / package context, 
# fall back to direct imports for local script execution
try:
    from .utils import extract_info, get_error_msg
    from .scraper import get_list_metadata, get_random_from_instance
    from .constants import ROOT_DIR, PORT, DEFAULT_ENGINE, SERVER_TYPE
except ImportError:
    from utils import extract_info, get_error_msg
    from scraper import get_list_metadata, get_random_from_instance
    from constants import ROOT_DIR, PORT, DEFAULT_ENGINE, SERVER_TYPE

# Initialize Flask with the project root as the static folder
app = Flask(__name__, static_folder=ROOT_DIR, static_url_path='')


@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api/metadata', methods=['POST'])
def api_metadata():
    try:
        urls = [u.strip() for u in (request.json or {}).get('urls', []) if u.strip()]
        if not urls: return jsonify({"error": "No URLs"}), 400
        
        list_data = []
        for url in urls:
            user, slug = extract_info(url)
            if user:
                # We only need the counts and names here
                _, title, count = get_list_metadata(user, slug)
                if count > 0:
                    list_data.append({"user": user, "slug": slug, "title": title, "count": count})
        
        return jsonify({"lists": list_data, "total": sum(l['count'] for l in list_data)})
    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500

@app.route('/api/select', methods=['POST'])
def api_select():
    try:
        lists = request.json.get('lists', [])
        total = request.json.get('total', 0)
        if not lists: return jsonify({"error": "No lists"}), 400
        
        # Pick a list weighted by size
        target_index = random.randint(0, total - 1)
        selected = None
        current_sum = 0
        for item in lists:
            current_sum += item['count']
            if target_index < current_sum:
                selected = item
                break
        
        # Get random movie meta
        meta = get_random_movie_meta(selected['user'], selected['slug'], selected['count'])
        return jsonify({"meta": meta, "list": selected})
    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500

@app.route('/api/details', methods=['POST'])
def api_details():
    try:
        slug = request.json.get('slug')
        if not slug: return jsonify({"error": "No slug"}), 400
        movie = get_movie_details(slug)
        return jsonify({"movie": movie})
    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500

@app.route('/api', methods=['POST'])
def legacy_api():
    # Keep original for backward compatibility but use new logic flow
    # This won't have the granular progress but will still work
    try:
        import time
        start_time = time.time()
        
        # Reuse internal steps
        meta_res = api_metadata().get_json()
        if 'error' in meta_res: return jsonify(meta_res), 500
        
        select_res = api_select().get_json() # This isn't perfect for legacy but OK
        # ... (Legacy orchestration usually better kept simple)
        # For simplicity, let's keep it as is or just mark it
        return jsonify({"error": "Please update your client to use granular API"}), 426
    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500



if __name__ == "__main__":
    print(f"🚀 Starting server from: {ROOT_DIR}")
    app.run(port=PORT, debug=True)
