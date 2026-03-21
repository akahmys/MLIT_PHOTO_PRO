import React, { useState, useEffect, useRef } from 'react';

        /* ======================================================
           遅延読込み画像コンポーネント
           ====================================================== */
export const LazyImage = ({ file, className, forceLoad = false }) => {
            const [url, setUrl] = useState('');
            const ref = useRef(null);

            useEffect(() => {
                if (!file) return;
                let objUrl = '';
                if (forceLoad) {
                    objUrl = URL.createObjectURL(file);
                    setUrl(objUrl);
                    return () => URL.revokeObjectURL(objUrl);
                }
                const obs = new IntersectionObserver(entries => {
                    if (entries[0].isIntersecting) {
                        objUrl = URL.createObjectURL(file);
                        setUrl(objUrl);
                        obs.disconnect();
                    }
                }, { rootMargin: '400px' });
                if (ref.current) obs.observe(ref.current);
                return () => { obs.disconnect(); if (objUrl) URL.revokeObjectURL(objUrl); };
            }, [file, forceLoad]);

            return <img ref={ref} src={url} className={className} />;
        };

