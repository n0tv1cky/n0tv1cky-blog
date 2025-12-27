from fastapi import APIRouter
from fastapi.responses import Response
import glob
import os
from app.markdown_parser import parse_markdown_file
from app.utils import get_ist_now
import xml.etree.ElementTree as ET
import logging
import pytz

logger = logging.getLogger(__name__)

router = APIRouter()


def get_published_blogs():
	"""Get all published blogs sorted by published_at"""
	files = glob.glob("./blogs/*.md")
	blogs = []
	for f in files:
		try:
			frontmatter, content = parse_markdown_file(f)
			if frontmatter.get('published'):
				frontmatter['filename'] = os.path.basename(f)
				frontmatter['content'] = content
				blogs.append(frontmatter)
		except Exception:
			continue
	# Sort by published_at descending
	blogs.sort(key=lambda x: x.get('published_at', ''), reverse=True)
	return blogs


@router.get("/feeds/rss.xml")
async def rss_feed():
	"""Generate RSS 2.0 feed for published blogs"""
	blogs = get_published_blogs()
	domain = os.getenv('DOMAIN_NAME', 'localhost:3000')
	protocol = 'https' if domain != 'localhost:3000' else 'http'
	base_url = f"{protocol}://{domain}"
	
	# Create RSS XML
	rss = ET.Element('rss', version='2.0')
	channel = ET.SubElement(rss, 'channel')
	
	ET.SubElement(channel, 'title').text = os.getenv('BLOG_TITLE', 'Blog')
	ET.SubElement(channel, 'link').text = base_url
	ET.SubElement(channel, 'description').text = os.getenv('BLOG_DESCRIPTION', 'Blog Feed')
	ET.SubElement(channel, 'language').text = 'en-us'
	# RSS dates should be in GMT/UTC
	now_utc = get_ist_now().astimezone(pytz.utc)
	ET.SubElement(channel, 'lastBuildDate').text = now_utc.strftime('%a, %d %b %Y %H:%M:%S GMT')
	
	for blog in blogs[:20]:  # Limit to 20 most recent
		item = ET.SubElement(channel, 'item')
		ET.SubElement(item, 'title').text = blog.get('title', '')
		ET.SubElement(item, 'link').text = f"{base_url}/blogs/{blog.get('slug', '')}"
		ET.SubElement(item, 'description').text = blog.get('description', '')
		ET.SubElement(item, 'guid', isPermaLink='true').text = f"{base_url}/blogs/{blog.get('slug', '')}"
		
		published_at = blog.get('published_at')
		if published_at:
			try:
				from datetime import datetime
				if isinstance(published_at, str):
					dt = datetime.fromisoformat(published_at.replace('Z', '+00:00'))
					if dt.tzinfo is None:
						dt = pytz.utc.localize(dt)
				else:
					dt = published_at
				# Convert to UTC for RSS
				if dt.tzinfo:
					dt_utc = dt.astimezone(pytz.utc)
				else:
					dt_utc = pytz.utc.localize(dt)
				ET.SubElement(item, 'pubDate').text = dt_utc.strftime('%a, %d %b %Y %H:%M:%S GMT')
			except Exception as e:
				logger.warning(f"Failed to parse published_at for blog {blog.get('slug')}: {e}")
	
	xml_str = ET.tostring(rss, encoding='utf-8', method='xml')
	return Response(content=xml_str, media_type='application/rss+xml')


@router.get("/feeds/sitemap.xml")
async def sitemap():
	"""Generate XML sitemap for SEO"""
	blogs = get_published_blogs()
	domain = os.getenv('DOMAIN_NAME', 'localhost:3000')
	protocol = 'https' if domain != 'localhost:3000' else 'http'
	base_url = f"{protocol}://{domain}"
	
	# Create sitemap XML
	urlset = ET.Element('urlset', xmlns='http://www.sitemaps.org/schemas/sitemap/0.9')
	
	# Homepage
	url = ET.SubElement(urlset, 'url')
	ET.SubElement(url, 'loc').text = base_url
	now_utc = get_ist_now().astimezone(pytz.utc)
	ET.SubElement(url, 'lastmod').text = now_utc.strftime('%Y-%m-%d')
	ET.SubElement(url, 'changefreq').text = 'daily'
	ET.SubElement(url, 'priority').text = '1.0'
	
	# Blog list
	url = ET.SubElement(urlset, 'url')
	ET.SubElement(url, 'loc').text = f"{base_url}/blogs"
	ET.SubElement(url, 'lastmod').text = now_utc.strftime('%Y-%m-%d')
	ET.SubElement(url, 'changefreq').text = 'daily'
	ET.SubElement(url, 'priority').text = '0.8'
	
	# Individual blogs
	for blog in blogs:
		url = ET.SubElement(urlset, 'url')
		ET.SubElement(url, 'loc').text = f"{base_url}/blogs/{blog.get('slug', '')}"
		
		published_at = blog.get('published_at')
		updated_at = blog.get('updated_at')
		lastmod = updated_at or published_at
		if lastmod:
			try:
				from datetime import datetime
				if isinstance(lastmod, str):
					dt = datetime.fromisoformat(lastmod.replace('Z', '+00:00'))
					if dt.tzinfo is None:
						dt = pytz.utc.localize(dt)
				else:
					dt = lastmod
				if dt.tzinfo:
					dt_utc = dt.astimezone(pytz.utc)
				else:
					dt_utc = pytz.utc.localize(dt)
				ET.SubElement(url, 'lastmod').text = dt_utc.strftime('%Y-%m-%d')
			except Exception as e:
				logger.warning(f"Failed to parse date for blog {blog.get('slug')}: {e}")
				now_utc = get_ist_now().astimezone(pytz.utc)
				ET.SubElement(url, 'lastmod').text = now_utc.strftime('%Y-%m-%d')
		else:
			now_utc = get_ist_now().astimezone(pytz.utc)
			ET.SubElement(url, 'lastmod').text = now_utc.strftime('%Y-%m-%d')
		
		ET.SubElement(url, 'changefreq').text = 'weekly'
		ET.SubElement(url, 'priority').text = '0.6'
	
	xml_str = ET.tostring(urlset, encoding='utf-8', method='xml')
	return Response(content=xml_str, media_type='application/xml')

