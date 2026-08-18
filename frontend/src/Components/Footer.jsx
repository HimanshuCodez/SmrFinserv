import React from "react";
import { Mail, Phone } from "lucide-react";

const stats = [
  { label: "Policies Sold", value: "20,000+" },
  { label: "Insurance Partners", value: "25+" },
  { label: "Businesses", value: "4,000+" },
  { label: "Sum Insured", value: "₹43,000 Cr." },
];

const productLinks = [
  "Directors and Officers",
  "Professional Indemnity",
  "Commercial General Liability",
  "Product Liability",
  "Cyber",
  "Crime",
  "Workmen's Compensation",
  "Contractor's All Risk",
  "Erection All Risk",
  "Contractor's Plant and Machinery",
  "Marine",
  "Fire",
  "Fire Loss of Profit",
  "Machinery Breakdown",
  "Machinery Loss of Profit",
  "Office Package",
  "Group Health",
  "Group Personal Accident",
];

const knowMoreLinks = [
  { name: "Blog", href: "#" },
  { name: "About", href: "#" },
  { name: "Contact Us", href: "#" },
  { name: "Resources", href: "#" },
];

const legalLinks = [
  { name: "Terms & Conditions", href: "#" },
  { name: "Privacy Policy", href: "#" },
];

const Footer = () => {
  return (
    <footer className="bg-gradient-to-b from-blue-900 to-black text-white">
      {/* Stats Bar */}

      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-8">
          {/* Newsletter & Locations */}
          <div className="col-span-1 md:col-span-3 lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-lg font-semibold">
                Subscribe to Our Newsletter
              </h3>
              <p className="text-blue-300 mt-1 text-sm">
                Get helpful business tips & insurance updates in your inbox.
              </p>
              <form className="mt-4 flex">
                <input
                  type="email"
                  placeholder="Email Address"
                  className="w-full px-4 py-2 rounded-l-md text-gray-800"
                />
                <button
                  type="submit"
                  className="bg-yellow-500 text-blue-900 px-4 py-2 rounded-r-md font-semibold"
                >
                  Subscribe
                </button>
              </form>
            </div>
            <div className="grid grid-cols-1 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Our Offices</h4>
                <ul className="space-y-1 text-blue-300">
                  <li className="mb-5">
                    {" "}
                    Address 1 : A-120,1st Floor, Raj Hans Kutumb , Indrapuram Ghaziabad,201014
                  </li>
                 
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Contact</h4>
                <div className="space-y-2 text-blue-300">
                  <a
                    href="tel:+919643434885"
                    className="flex items-center mb-2 hover:text-yellow-400"
                  >
                    <Phone size={16} className="mr-2" />
                    +919643434885
                  </a>
                  <a
                    href="tel:+919711971269"
                    className="flex items-center hover:text-yellow-400"
                  >
                    <Phone size={16} className="mr-2" />
                    +919711971269
                  </a>
                  <a
                    href="mailto:namaste@bimakavach.com"
                    className="flex items-center hover:text-yellow-400"
                  >
                    <Mail size={16} className="mr-2" />
                    contact@smrfinserv.com
                  </a>
                  <a
                    href="mailto:Info@smrfinserv.com
"
                    className="flex items-center hover:text-yellow-400"
                  >
                    <Mail size={16} className="mr-2" />
                    Info@smrfinserv.com
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Product Links */}
          {/* <div>
                        <h3 className="text-lg font-semibold">Products</h3>
                        <ul className="mt-4 space-y-2 text-sm">
                            {productLinks.slice(0, 8).map((link, index) => (
                                <li key={index}><a href="#" className="text-blue-300 hover:text-yellow-400">{link}</a></li>
                            ))}
                        </ul>
                    </div> */}

          {/* Legal & Social */}
          <div>
            <h3 className="text-lg font-semibold">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm">
              {legalLinks.map((link) => (
                <li key={link.name}>
                  <a
                    href={link.href}
                    className="text-blue-300 hover:text-yellow-400"
                  >
                    {link.name}
                  </a>
                </li>
              ))}
            </ul>
            {/* Social media icons can go here */}
          </div>
        </div>

        {/* Disclaimer */}

        {/* Backed by */}
      </div>
    </footer>
  );
};

export default Footer;
