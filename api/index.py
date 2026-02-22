from flask import Flask, request, jsonify
import random, os

# Try relative imports for Vercel / package context, 
# fall back to direct imports for local script execution
try:
    from .utils import extract_info, get_error_msg
    from .scraper import get_list_metadata, get_random_from_instance
except ImportError:
    from utils import extract_info, get_error_msg
    from scraper import get_list_metadata, get_random_from_instance

# Absolute path to the folder containing index.html (the project root)
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

# Initialize Flask with the project root as the static folder
app = Flask(__name__, static_folder=ROOT_DIR, static_url_path='')

@app.route('/')
def index():
    return app.send_static_file('index.html')

@app.route('/api', methods=['POST'])
def randomize():
    try:
        import time
        start_time = time.time()
        
        urls = [u.strip() for u in (request.json or {}).get('urls', []) if u.strip()]
        if not urls: return jsonify({"error": "No URLs provided"}), 400
            
        # 1. Fetch metadata for all lists
        meta_start = time.time()
        list_data = []
        total_count = 0
        for url in urls:
            user, slug = extract_info(url)
            if user:
                lb_instance, title, count = get_list_metadata(user, slug)
                if count > 0:
                    list_data.append({"instance": lb_instance, "title": title, "count": count, "url": url})
                    total_count += count
        meta_duration = time.time() - meta_start
        
        if not list_data:
            return jsonify({"error": "No valid movies found in provided lists"}), 404
            
        # 2. Pick a list weighted by its size
        select_start = time.time()
        target_index = random.randint(0, total_count - 1)
        selected_list = None
        current_sum = 0
        for item in list_data:
            current_sum += item['count']
            if target_index < current_sum:
                selected_list = item
                break
        
        # 3. Get random movie from the selected list
        movie = get_random_from_instance(selected_list['instance'], selected_list['count'])
        select_duration = time.time() - select_start
        
        if not movie:
            return jsonify({"error": "Failed to extract movie"}), 500
            
        # 4. Calculate probability
        probability = (1 / total_count) * 100
        total_duration = time.time() - start_time
        
        return jsonify({
            "movie": {k: movie.get(k) for k in ['name', 'url', 'year', 'poster', 'rating']},
            "list": {"title": selected_list['title'], "url": selected_list['url']},
            "stats": {
                "total_pool": total_count,
                "probability": f"{probability:.4f}" if probability < 0.01 else f"{probability:.2f}",
                "timing": {
                    "metadata": f"{meta_duration:.2f}s",
                    "selection": f"{select_duration:.2f}s",
                    "total": f"{total_duration:.2f}s"
                },
                "server": "Vercel/Flask",
                "engine": "letterboxdpy-granular"
            }
        })
    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500


if __name__ == "__main__":
    print(f"🚀 Starting server from: {ROOT_DIR}")
    # Using port 5050 to avoid any potential port 5000 conflicts
    app.run(port=5050, debug=True)
