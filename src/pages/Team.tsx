import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import VistaprintNav from "@/components/VistaprintNav";
import Footer from "@/components/Footer";

const teamMembers = [
  {
    name: "Wayne Strobel",
    title: "Founder / CEO",
    image: "/images/team/wayne.png"
  },
  {
    name: "Hamza Sakar",
    title: "Project Manager",
    image: "/images/team/hamza.png"
  },
  {
    name: "Shikha Dodecha",
    title: "Technical Lead",
    image: "/images/team/shikha.png"
  },
  {
    name: "Kwasi Adofo",
    title: "Frontend UI/UX Engineer",
    image: "/images/team/kwasi.png"
  },
  {
    name: "Ralph Desir",
    title: "Quality Lead",
    image: "/images/team/ralph.png"
  },
  {
    name: "Derrick Yeboah",
    title: "Backend & Infrastructure Engineer",
    image: "/images/team/derrick.png"
  }
];

export default function Team() {
  const nav = useNavigate();

  useEffect(() => {
    document.title = "Our Team - Print Power Purpose";
  }, []);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <VistaprintNav />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 to-white border-b border-gray-200 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6">
            Meet Our Team
          </h1>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            The people powering purpose through print.
          </p>
        </div>
      </section>

      {/* Team Grid */}
      <section className="flex-1 py-12 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {teamMembers.map((member, idx) => (
              <div 
                key={idx} 
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 flex flex-col items-center text-center hover:shadow-md transition-shadow"
              >
                {/* Image */}
                <div className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-gray-100 border-2 border-blue-100 overflow-hidden mb-4 flex items-center justify-center">
                  <img 
                    src={member.image} 
                    alt={member.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `<span class="text-3xl font-bold text-blue-400">${member.name.split(' ').map(n => n[0]).join('')}</span>`;
                    }}
                  />
                </div>
                
                {/* Name */}
                <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-1">
                  {member.name}
                </h3>
                
                {/* Title */}
                <p className="text-sm text-gray-600">
                  {member.title}
                </p>
              </div>
            ))}
          </div>

          {/* Join Us CTA */}
          <div className="mt-16 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-100 p-8 text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              Join Our Mission
            </h2>
            <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
              We're always looking for talented individuals who share our passion for social impact.
            </p>
            <button
              onClick={() => nav('/contact')}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
            >
              Get In Touch
            </button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
