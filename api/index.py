import random
import traceback

from flask import Flask, jsonify, request

from .constants import PORT, ROOT_DIR
from .scraper import (
    get_list_metadata,
    get_movie_details,
    get_random_movie_meta,
)
from .utils import extract_info, get_error_msg




app = Flask(__name__, static_folder=ROOT_DIR, static_url_path="")


@app.route("/")
def index():
    return app.send_static_file("index.html")


@app.route("/api/metadata", methods=["POST"])
@app.route("/metadata", methods=["POST"])
def api_metadata():

    try:
        urls = [u.strip() for u in (request.json or {}).get("urls", []) if u.strip()]
        print(f"DEBUG: [START] api_metadata with {len(urls)} urls")
        if not urls:
            return jsonify({"error": "No URLs"}), 400

        list_data = []
        for url in urls:
            try:
                user, slug = extract_info(url)
                if user:
                    print(f"DEBUG: [FETCH] Metadata for {user}/{slug}...")
                    # We only need the counts and names here
                    _, title, count = get_list_metadata(user, slug)
                    if count > 0:
                        list_data.append(
                            {"user": user, "slug": slug, "title": title, "count": count}
                        )
                    print(f"DEBUG: [RESULT] Found {count} items in {title}")
            except Exception as e:
                print(f"DEBUG: [ERROR] Skipping {url} - {str(e)}")
                continue

        if not list_data:
            print("DEBUG: [FINISH] api_metadata -> No valid lists found")
            return jsonify({"error": "No valid movies found in provided lists"}), 404

        print(f"DEBUG: [FINISH] api_metadata -> Success ({len(list_data)} lists)")
        return jsonify(
            {"lists": list_data, "total": sum(item["count"] for item in list_data)}
        )

    except Exception as e:
        print("DEBUG: [CRITICAL] api_metadata crashed!")
        traceback.print_exc()
        return jsonify({"error": get_error_msg(e)}), 500



@app.route("/api/select", methods=["POST"])
@app.route("/select", methods=["POST"])
def api_select():

    try:
        lists = request.json.get("lists", [])
        total = request.json.get("total", 0)
        print(f"DEBUG: [START] api_select from {len(lists)} lists, total pool: {total}")
        if not lists:
            return jsonify({"error": "No lists"}), 400

        # Pick a list weighted by size
        target_index = random.randint(0, total - 1)
        selected = None
        current_sum = 0
        for item in lists:
            current_sum += item["count"]
            if target_index < current_sum:
                selected = item
                break

        print(f"DEBUG: [ACTION] Selected list: {selected['user']}/{selected['slug']}")
        # Get random movie meta
        meta = get_random_movie_meta(
            selected["user"], selected["slug"], selected["count"]
        )
        print(f"DEBUG: [FINISH] api_select -> Success ({meta['name']})")
        return jsonify({"meta": meta, "list": selected})
    except Exception as e:
        print("DEBUG: [CRITICAL] api_select crashed!")
        traceback.print_exc()
        return jsonify({"error": get_error_msg(e)}), 500



@app.route("/api/details", methods=["POST"])
@app.route("/details", methods=["POST"])
def api_details():

    try:
        slug = request.json.get("slug")
        if not slug:
            return jsonify({"error": "No slug"}), 400
        movie = get_movie_details(slug)
        return jsonify({"movie": movie})
    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500


@app.route("/api", methods=["POST"])
def legacy_api():
    # Keep original for backward compatibility but use new logic flow
    # This won't have the granular progress but will still work
    try:
        # Reuse internal steps
        meta_res = api_metadata().get_json()
        if "error" in meta_res:
            return jsonify(meta_res), 500

        api_select().get_json()  # Trigger logic even if result unused currently
        return jsonify({"error": "Please update your client to use granular API"}), 426

    except Exception as e:
        return jsonify({"error": get_error_msg(e)}), 500


if __name__ == "__main__":
    print(f"🚀 Starting server from: {ROOT_DIR}")
    app.run(port=PORT, debug=True)
