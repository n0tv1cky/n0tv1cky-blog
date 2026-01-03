import { useEffect, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { getBaseUrl } from './api';

const SESSION_KEY = 'blog_session_id';
const HEARTBEAT_INTERVAL = 10000; // 10 seconds
const SCROLL_THROTTLE = 1000; // 1 second

// Simple browser fingerprint
const generateFingerprint = () => {
  if (typeof window === 'undefined') return null;
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset()
  ].join('###');
  
  // Simple hash
  let hash = 0;
  for (let i = 0; i < components.length; i++) {
    const char = components.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

// Get or create session ID
const getSessionId = () => {
  if (typeof window === 'undefined') return null;
  
  let sessionId = localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = uuidv4();
    localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
};

// API helper
const trackingFetch = async (endpoint, data, method = 'POST') => {
  try {
    const baseUrl = getBaseUrl();
    const response = await fetch(`${baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return response.ok ? await response.json() : null;
  } catch (error) {
    console.error('Tracking error:', error);
    return null;
  }
};

export const useMetrics = (blogSlug) => {
  const [pageViewId, setPageViewId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const startTimeRef = useRef(Date.now());
  const maxScrollDepthRef = useRef(0);
  const heartbeatIntervalRef = useRef(null);
  const lastScrollTimeRef = useRef(0);
  const hasSentInitialView = useRef(false);
  const isPageVisibleRef = useRef(true);
  const hiddenTimeRef = useRef(0); // Track time when page was hidden
  const totalHiddenTimeRef = useRef(0); // Track accumulated hidden time
  
  // Initialize session
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const sid = getSessionId();
    setSessionId(sid);
    
    const fingerprint = generateFingerprint();
    const referrer = document.referrer || '';
    
    trackingFetch('/api/metrics/session', {
      session_id: sid,
      fingerprint,
      user_agent: navigator.userAgent,
      referrer
    });
  }, []);
  
  // Track page view
  useEffect(() => {
    if (!sessionId || !blogSlug || hasSentInitialView.current) return;
    
    const trackPageView = async () => {
      const data = await trackingFetch('/api/metrics/pageview', {
        session_id: sessionId,
        blog_slug: blogSlug,
        referrer: document.referrer || ''
      });
      
      if (data && data.id) {
        setPageViewId(data.id);
        hasSentInitialView.current = true;
      }
    };
    
    trackPageView();
  }, [sessionId, blogSlug]);
  
  // Track page visibility to pause metrics when tab is hidden
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is now hidden - record when it was hidden
        isPageVisibleRef.current = false;
        hiddenTimeRef.current = Date.now();
        console.log('📊 Metrics: Tab hidden - pausing tracking');
      } else {
        // Page is now visible - add hidden duration to total
        isPageVisibleRef.current = true;
        if (hiddenTimeRef.current > 0) {
          const hiddenDuration = Date.now() - hiddenTimeRef.current;
          totalHiddenTimeRef.current += hiddenDuration;
          console.log(`📊 Metrics: Tab visible - was hidden for ${Math.floor(hiddenDuration / 1000)}s`);
          hiddenTimeRef.current = 0;
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Track scroll depth
  useEffect(() => {
    if (!pageViewId) return;
    
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastScrollTimeRef.current < SCROLL_THROTTLE) return;
      lastScrollTimeRef.current = now;
      
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY;
      const scrollPercent = Math.round(
        ((scrollTop + windowHeight) / documentHeight) * 100
      );
      
      if (scrollPercent > maxScrollDepthRef.current) {
        maxScrollDepthRef.current = Math.min(scrollPercent, 100);
      }
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [pageViewId]);
  
  // Heartbeat to update time spent (only when page is visible)
  useEffect(() => {
    if (!pageViewId) return;
    
    heartbeatIntervalRef.current = setInterval(() => {
      // Only track time if page is visible
      if (!isPageVisibleRef.current) {
        console.log('📊 Metrics: Heartbeat skipped (tab hidden)');
        return;
      }
      
      // Calculate actual visible time (total time - hidden time)
      const totalElapsed = Date.now() - startTimeRef.current;
      const visibleTime = Math.floor((totalElapsed - totalHiddenTimeRef.current) / 1000);
      
      console.log(`📊 Metrics: Heartbeat sent - ${visibleTime}s visible (${Math.floor(totalHiddenTimeRef.current / 1000)}s hidden)`);
      
      trackingFetch(
        `/api/metrics/pageview/${pageViewId}`,
        {
          time_spent: visibleTime,
          scroll_depth: maxScrollDepthRef.current,
          is_bounce: false
        },
        'PATCH'
      );
    }, HEARTBEAT_INTERVAL);
    
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
    };
  }, [pageViewId]);
  
  // Final update on unmount
  useEffect(() => {
    return () => {
      if (!pageViewId) return;
      
      // Calculate final visible time
      const totalElapsed = Date.now() - startTimeRef.current;
      const currentHiddenTime = isPageVisibleRef.current ? 0 : (Date.now() - hiddenTimeRef.current);
      const visibleTime = Math.floor((totalElapsed - totalHiddenTimeRef.current - currentHiddenTime) / 1000);
      
      const data = JSON.stringify({
        time_spent: visibleTime,
        scroll_depth: maxScrollDepthRef.current,
        exit_page: true
      });
      
      const baseUrl = getBaseUrl();
      // Use sendBeacon for reliability on page unload
      if (navigator.sendBeacon) {
        navigator.sendBeacon(
          `${baseUrl}/api/metrics/pageview/${pageViewId}`,
          new Blob([data], { type: 'application/json' })
        );
      }
    };
  }, [pageViewId]);
  
  // Track custom interactions
  const trackInteraction = (eventType, eventTarget, eventData = {}) => {
    if (!sessionId || !blogSlug) return;
    
    trackingFetch('/api/metrics/interaction', {
      session_id: sessionId,
      blog_slug: blogSlug,
      event_type: eventType,
      event_target: eventTarget,
      event_data: eventData
    });
  };
  
  return { trackInteraction };
};
