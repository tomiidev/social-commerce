import React from 'react';
import { InstagramIcon, FacebookIcon, MeliIcon, ShopifyIcon } from './SocialIcons';
import { Users } from 'lucide-react';

interface ChannelBadgeProps {
  channel: 'instagram' | 'facebook' | 'mercadolibre' | 'shopify';
}

export const ChannelBadge: React.FC<ChannelBadgeProps> = ({ channel }) => {
  let IconComponent;
  let classes = '';

  switch (channel) {
    case 'instagram':
      IconComponent = InstagramIcon;
      classes = 'bg-pink-50 text-pink-600 border-pink-100';
      break;
    case 'facebook':
      IconComponent = FacebookIcon;
      classes = 'bg-blue-50 text-blue-600 border-blue-100';
      break;
    case 'shopify':
      IconComponent = ShopifyIcon;
      classes = 'bg-slate-100 text-slate-800 border-slate-200';
      break;
    case 'mercadolibre':
      IconComponent = MeliIcon;
      classes = 'bg-yellow-50 text-yellow-600 border-yellow-100';
      break;
    default:
      IconComponent = Users;
      classes = 'bg-slate-50 text-slate-600 border-slate-200';
  }

  return (
    <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold flex items-center space-x-1 w-fit border ${classes}`}>
      <IconComponent className="h-3 w-3" />
      <span className="capitalize">{channel}</span>
    </span>
  );
};
